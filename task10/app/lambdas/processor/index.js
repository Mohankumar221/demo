const AWSXRay = require('aws-xray-sdk');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));
const https = AWSXRay.captureHTTPs(require('https'));
const { v4: uuidv4 } = require('uuid');

const dynamoDb = new AWS.DynamoDB.DocumentClient();

const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m';
const DYNAMODB_TABLE_NAME = 'Weather';

exports.handler = async (event, context) => {
  const segment = AWSXRay.getSegment();
  segment.addAnnotation('LambdaName', 'processor');

  try {
    const weatherData = await fetchWeatherData();
    await storeWeatherDataInDynamoDB(weatherData);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Weather data processed and stored successfully!' })
    };
  } catch (error) {
    segment.addError(error);
    console.error('Error processing weather data:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error processing weather data', error: error.message })
    };
  } finally {
    segment.close();
  }
};

async function fetchWeatherData() {
  return new Promise((resolve, reject) => {
    const req = https.request(WEATHER_API_URL, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
       );
    });

    req.end();
  });
}

async function storeWeatherDataInDynamoDB(weatherData) {
  const item = {
    id: uuidv4(),
    forecast: {
      elevation: weatherData.elevation,
      generationtime_ms: weatherData.generationtime_ms,
      hourly: {
        temperature_2m: weatherData.hourly.temperature_2m,
        time: weatherData.hourly.time
      },
      hourly_units: {
        temperature_2m: weatherData.hourly_units.temperature_2m,
        time: weatherData.hourly_units.time
      },
      latitude: weatherData.latitude,
      longitude: weatherData.longitude,
      timezone: weatherData.timezone,
      timezone_abbreviation: weatherData.timezone_abbreviation,
      utc_offset_seconds: weatherData.utc_offset_seconds
    }
  };

  const params = {
    TableName: DYNAMODB_TABLE_NAME,
    Item: item
  };

  await dynamoDb.put(params).promise();
}

