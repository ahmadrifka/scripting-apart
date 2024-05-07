const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");
var fs = require("fs");

const callApi = async (location, isName = false, pages, manualSearch=false) => {
  let api = `https://www.rumah123.com/sewa/cari/?location=${location}`;
  if (isName) {
    const updatedLocation = location.replace(" ", "%20");
    api = `https://www.rumah123.com/sewa/cari/?q=${updatedLocation}`;
    if (pages > 1) {
      api = `https://www.rumah123.com/sewa/cari/?q=${updatedLocation}&page=${pages}`;
    }
  }
  if(manualSearch) {
    api = `https://www.rumah123.com/sewa/cari/?${location}`;
  }
  const response = await fetch(api);
  if (!response.ok) {
    console.log("ERROR");
  }
  const data = await response.blob();
  const jsonData = await getDataFromJSONLD(await data.text());
  if (jsonData) {
    await generateSheet(jsonData[2]);
    return;
  }
  console.log("Try again...");
};

function getDataFromJSONLD(html) {
  // Create a DOM from the HTML string
  const dom = new JSDOM(html);

  // Get all script tags in the DOM
  const scriptTags = dom.window.document.querySelectorAll(
    'script[type="application/ld+json"]'
  );
  // Initialize an array to store extracted data
  const extractedData = [];
  if (scriptTags.length === 0) {
    console.warn('No script tags with type="application/ld+json" found.');
    return extractedData; // Return empty array
  }
  // Iterate over each script tag
  scriptTags.forEach((script) => {
    try {
      // Parse JSON data from the script tag's text content
      const jsonData = JSON.parse(script.textContent.trim());
      // Push the extracted data to the array
      extractedData.push(jsonData);
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }
  });

  // return extractedData;
  const data = extractedData[1]["@graph"];
  return data;
}

function getDataDetailFromJSONLD(html) {
  // Create a DOM from the HTML string
  const dom = new JSDOM(html);

  // Get all script tags in the DOM
  const scriptTags = dom.window.document.querySelectorAll(
    'script[type="application/ld+json"]'
  );
  // Initialize an array to store extracted data
  const extractedData = [];
  if (scriptTags.length === 0) {
    console.warn('No script tags with type="application/ld+json" found.');
    return extractedData; // Return empty array
  }
  // Iterate over each script tag
  scriptTags.forEach((script) => {
    try {
      // Parse JSON data from the script tag's text content
      const jsonData = JSON.parse(script.textContent.trim());
      // Push the extracted data to the array
      //   console.log("js", jsonData);
      extractedData.push(jsonData);
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }
  });

  // return extractedData;
  const data = extractedData[1];
  return data;
}

const getDetailData = async (url) => {
  const response = await fetch(url);
  //   console.log("response detail ===========");
  const data = await response.blob();
  const dataJson = getDataDetailFromJSONLD(await data.text());
  return dataJson;
};

const generateSheet = async (dataList) => {
  const result = [];
  console.log("generateing sheet...");
  console.log("total data: " + dataList.length);
  console.log("please wait...");
  for (const data of dataList) {
    const updatedData = await getDetailData(data.url);
    if (!updatedData || updatedData.address === undefined) {
      console.log("data detail empty");
      return;
    }
    if (updatedData.accommodationCategory == "Apartment") {
      result.push({
        "nama apart": data.name,
        address: data.address?.addressLocality,
        Luas: updatedData.floorSize.value,
        BA: updatedData.numberOfBathroomsTotal,
        BR: updatedData.numberOfBedrooms,
        price: (updatedData.offers?.price)
          .toFixed(2)
          .replace(/\d(?=(\d{3})+\.)/g, "$&,"),
        currency: updatedData.offers?.priceCurrency,
        "link detail": data.url,
      });
    }
  }
  //   console.log("result", result);
  const sourcePath = "./data.json";
  fs.writeFile(sourcePath, JSON.stringify(result), function (err) {
    if (err) throw err;
    console.log("complete");
  });
};

const daerah = false;
const manualSearch = true;

const keywords = "residential[]=1-park-residence-vap1789";
const index = 5;
callApi(keywords, !daerah, index, manualSearch);
