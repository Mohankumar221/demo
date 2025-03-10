const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Initialize AWS SDK clients
const cognito = new AWS.CognitoIdentityServiceProvider();
const dynamoDb = new AWS.DynamoDB.DocumentClient();

// Environment variables
const USER_POOL_ID = process.env.cup_id; // Cognito User Pool ID
const CLIENT_ID = process.env.cup_client_id; // Cognito User Pool Client ID
const TABLES_TABLE_NAME = process.env.tables_table; // DynamoDB table for tables
const RESERVATIONS_TABLE_NAME = process.env.reservations_table; // DynamoDB table for reservations

exports.handler = async (event) => {
  const { path, httpMethod, body } = event;

  try {
    switch (path) {
      case '/signin':
        if (httpMethod === 'POST') {
          return await handleSignin(JSON.parse(body));
        }
        break;

      case '/signup':
        if (httpMethod === 'POST') {
          return await handleSignup(JSON.parse(body));
        }
        break;

      case '/tables':
        if (httpMethod === 'GET') {
          return await getTables();
        } else if (httpMethod === 'POST') {
          return await createTable(JSON.parse(body));
        }
        break;

      case '/tables/{tableId}':
        if (httpMethod === 'GET') {
          const tableId = event.pathParameters.tableId;
          return await getTableById(tableId);
        }
        break;

      case '/reservations':
        if (httpMethod === 'GET') {
          return await getReservations();
        } else if (httpMethod === 'POST') {
          return await createReservation(JSON.parse(body));
        }
        break;

      default:
        return formatResponse(404, { message: 'Resource not found' });
    }
  } catch (error) {
    console.error('Error:', error);
    return formatResponse(500, { message: 'Internal server error', error: error.message });
  }
};

async function handleSignin({ username, password }) {
  const params = {
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  };

  try {
    const result = await cognito.initiateAuth(params).promise();
    return formatResponse(200, { message: 'Signin successful', token: result.AuthenticationResult.IdToken });
  } catch (error) {
    console.error('Signin error:', error);
    return formatResponse(400, { message: 'Signin failed', error: error.message });
  }
}

async function handleSignup({ username, password, email }) {
  const params = {
    UserPoolId: USER_POOL_ID,
    Username: username,
    UserAttributes: [
      { Name: 'email', Value: email },
    ],
    TemporaryPassword: password,
  };

  try {
    await cognito.adminCreateUser(params).promise();
    return formatResponse(201, { message: 'Signup successful' });
  } catch (error) {
    console.error('Signup error:', error);
    return formatResponse(400, { message: 'Signup failed', error: error.message });
  }
}

async function getTables() {
  const params = {
    TableName: TABLES_TABLE_NAME,
  };

  try {
    const result = await dynamoDb.scan(params).promise();
    return formatResponse(200, { tables: result.Items });
  } catch (error) {
    console.error('Get tables error:', error);
    return formatResponse(500, { message: 'Failed to fetch tables', error: error.message });
  }
}

async function createTable({ name, capacity }) {
  const params = {
    TableName: TABLES_TABLE_NAME,
    Item: {
      id: uuidv4(),
      name,
      capacity,
    },
  };

  try {
    await dynamoDb.put(params).promise();
    return formatResponse(201, { message: 'Table created successfully' });
  } catch (error) {
    console.error('Create table error:', error);
    return formatResponse(500, { message: 'Failed to create table', error: error.message });
  }
}

async function getTableById(tableId) {
  const params = {
    TableName: TABLES_TABLE_NAME,
    Key: { id: tableId },
  };

  try {
    const result = await dynamoDb.get(params).promise();
    if (!result.Item) {
      return formatResponse(404, { message: 'Table not found' });
    }
    return formatResponse(200, { table: result.Item });
  } catch (error) {
    console.error('Get table by ID error:', error);
    return formatResponse(500, { message: 'Failed to fetch table', error: error.message });
  }
}

async function getReservations() {
  const params = {
    TableName: RESERVATIONS_TABLE_NAME,
  };

  try {
    const result = await dynamoDb.scan(params).promise();
    return formatResponse(200, { reservations: result.Items });
  } catch (error) {
    console.error('Get reservations error:', error);
    return formatResponse(500, { message: 'Failed to fetch reservations', error: error.message });
  }
}

async function createReservation({ tableId, customerName, reservationTime }) {
  const params = {
    TableName: RESERVATIONS_TABLE_NAME,
    Item: {
      id: uuidv4(),
      tableId,
      customerName,
      reservationTime,
    },
  };

  try {
    await dynamoDb.put(params).promise();
    return formatResponse(201, { message: 'Reservation created successfully' });
  } catch (error) {
    console.error('Create reservation error:', error);
    return formatResponse(500, { message: 'Failed to create reservation', error: error.message });
  }
}

function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}