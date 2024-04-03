const { Builder, Browser, By } = require("selenium-webdriver");
const { Options } = require("selenium-webdriver/chrome");

const returnTimestamp = (dateString) => {
  if (dateString.split(" ").length == 1) {
    const components = dateString.split("/");
    const year = parseInt(components[2]);
    const month = parseInt(components[1]);
    const day = parseInt(components[0]);

    const date = new Date(year, month - 1, day);
    date.setHours(date.getHours() + 2); // Adjust for GMT+2 timezone

    const formattedDate = `${date.getFullYear()}-${padZero(
      date.getMonth() + 1
    )}-${padZero(date.getDate())}T${padZero(date.getHours())}:${padZero(
      date.getMinutes()
    )}:${padZero(date.getSeconds())}+02:00`;

    return formattedDate;
  }
  if (dateString.split(" ").length == 2) {
    const [datePart, timePart] = dateString.split(" ");
    const [day, month, year] = datePart.split("/");
    const [hours, minutes] = timePart.split(":");

    const date = new Date(year, month - 1, day, hours, minutes);
    // date.setHours(date.getHours() + 2); // Adjust for GMT+2 timezone

    const formattedDate = `${date.getFullYear()}-${padZero(
      date.getMonth() + 1
    )}-${padZero(date.getDate())}T${padZero(date.getHours())}:${padZero(
      date.getMinutes()
    )}:${padZero(date.getSeconds())}+02:00`;

    return formattedDate;
  }

  function padZero(num) {
    return num < 10 ? "0" + num : num;
  }

  const date = new Date();
  date.setHours(date.getHours() + 2); // Adjust for GMT+2 timezone

  const formattedDate = `${date.getFullYear()}-${padZero(
    date.getMonth() + 1
  )}-${padZero(date.getDate())}T${padZero(date.getHours())}:${padZero(
    date.getMinutes()
  )}:${padZero(date.getSeconds())}+02:00`;

  return formattedDate;
};

async function getUmucyoAssignments() {
  console.log("Getting assignments from umucyo");
  const { SELENIUM_HOST, SELENIUM_PORT } = process.env;
  const chromeOptions = new Options();
  chromeOptions.addArguments("--headless");
  let driver = await new Builder()
    // .usingServer("http://chrome:4444")
    // .usingServer("http://selenium-hub:4444/wd/hub")

    // .usingServer(`http://${SELENIUM_HOST}:${SELENIUM_PORT}/wd/hub`) //Enable this when u r running inside of docker compose
    .forBrowser(Browser.CHROME)
    .setChromeOptions(chromeOptions)
    .build();
  try {
    await driver.get("https://umucyo.gov.rw/");
    await driver.manage().window().setRect({ width: 1512, height: 859 });
    await driver.switchTo().frame(7);
    await driver.findElement(By.linkText("e-Bidding")).click();
    await driver.findElement(By.linkText("List of advertising (all)")).click();
    await driver.findElement(By.id("tendTypeCd")).click();
    {
      const dropdown = await driver.findElement(By.id("tendTypeCd"));
      await dropdown
        .findElement(By.xpath("//option[. = 'Consultant Services']"))
        .click();
    }
    await driver.findElement(By.id("recordCountPerPage")).click();
    {
      const dropdown = await driver.findElement(By.id("recordCountPerPage"));
      await dropdown
        .findElement(By.xpath("//option[. = '50 records']"))
        .click();
    }

    const assignments = [];

    //getting the table with assignments
    const table = await driver.findElement(
      By.xpath("/html/body/div[1]/div[3]/div[2]/form[2]/table")
    );

    const trs = await table.findElements(By.tagName("tr"));

    //looping through the table to get the data
    //we dont need the headers so we start from 1
    for (let i = 1; i < trs.length; i++) {
      const tds = await trs[i].findElements(By.tagName("td"));
      //checking if we have correct data in this row otherwise skip it
      if (tds.length === 8) {
        //we are good to go
        //currently, the assingments table have 8 columns
        const assignment = {
          tenderName: await tds[1].getText(),
          tenderNumber: await tds[2].getText(),
          status: await tds[3].getText(),
          advertisingDate: await tds[4].getText(),
          submissionDeadline: await tds[5].getText(),
          openingDate: await tds[6].getText(),
          stageType: await tds[7].getText(),
        };

        assignments.push(assignment);
      }
    }

    //log the assignments
    // console.log({ totalAssignments: assignments.length, assignments });
    console.log({ totalAssignments: assignments.length });

    //saving data to the DB
    assignments.forEach(async (assignment, index) => {
      try {
        const response = await fetch(
          // process.env.ASSIGNMENTS_BACKEND_URL + "/api/v1/assignments",
          process.env.ASSIGNMENTS_DOCKER_COMPOSE_BACKEND_URL +
            "/api/v1/assignments",
          {
            method: "POST",
            body: JSON.stringify({
              country: "Rwanda",
              headline: assignment.tenderName,
              url: `https://www.umucyo.gov.rw/eb/bav/selectListAdvertisingListForGU.do?tendReferNo=${assignment.tenderNumber}`,
              // tags: [],
              createdAt: returnTimestamp(assignment.advertisingDate),
              expiredAt: returnTimestamp(assignment.submissionDeadline),
            }),
            headers: { "Content-Type": "application/json" },
          }
        );
        if (response.ok && response.status === 201) {
          console.log("✅ Saved : " + assignment.tenderName);
        } else {
          const data = await response.json();
          console.log(`🐞 ${data.message || "Something went wrong"}`);
        }
      } catch (error) {
        console.log(
          "🔥 Something went wrong while saving the assignment. " +
            error.message
        );
      }
    });
  } catch (error) {
    //handle the error
    console.log("Error: ", error.message || "Something went wrong");
  } finally {
    await driver.quit();
  }
}

module.exports = {
  getUmucyoAssignments,
};
