const AWS = require("aws-sdk");
const https = require("https");
const { v4: uuidv4 } = require("uuid");

// Initialize AWS SDK clients
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const xray = AWS.XRay.captureHTTPs(https);

// Environment variables
const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast?latitude=35&longitude=139&hourly=temperature_2m";
const DYNAMODB_TABLE_NAME = process.env.target_table; // DynamoDB table name from environment variable

exports.handler = async (event, context) => {
  // Start X-Ray tracing
  const segment = AWS.XRay.getSegment();
  segment.addAnnotation("LambdaName", "processor");

  try {
    // Fetch weather data
    const weatherData = await fetchWeatherData();

    // Store weather data in DynamoDB
    await storeWeatherDataInDynamoDB(weatherData);

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Weather data processed and stored successfully!" }),
    };
  } catch (error) {
    segment.addError(error);
    console.error("Error processing weather data:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error processing weather data", error: error.message }),
    };
  } finally {
    // End X-Ray tracing
    segment.close();
  }
};

async function fetchWeatherData() {
  return new Promise((resolve, reject) => {
    const req = xray.request(WEATHER_API_URL, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to fetch weather data. HTTP Status: ${res.statusCode}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}

async function storeWeatherDataInDynamoDB(weatherData) {
  const item = {
    id: uuidv4(),
    forecast: weatherData,
  };

  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    Item: item,
  };

  await dynamoDb.put(params).promise();
}