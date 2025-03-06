package com.task04;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.syndicate.deployment.annotations.events.SqsTriggerEventSource;
import com.syndicate.deployment.annotations.lambda.LambdaHandler;
import com.syndicate.deployment.model.RetentionSetting;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@LambdaHandler(
    lambdaName = "sqs_handler",
	roleName = "sqs_handler-role",
	isPublishVersion = true,
	aliasName = "learn",
	logsExpiration = RetentionSetting.SYNDICATE_ALIASES_SPECIFIED
)
@SqsTriggerEventSource(
		targetQueue = "async_queue",
		batchSize = 10
)
public class SqsHandler implements RequestHandler<Object, Map<String, Object>> {


	@Override
	public Map<String, Object> handleRequest(Object request, Context context) {
		System.out.println("Received SQS event");

		// Convert the request to a Map and extract messages
		if (request instanceof Map) {
			Map<String, Object> event = (Map<String, Object>) request;
			Object recordsObj = event.get("Records");

			if (recordsObj instanceof List) {
				List<Map<String, Object>> records = (List<Map<String, Object>>) recordsObj;
				for (Map<String, Object> record : records) {
					String messageBody = (String) record.get("body");
					System.out.println("SQS Message: " + messageBody);
					context.getLogger().log("SQS Message: " + messageBody);
				}
			}
		}

		Map<String, Object> response = new HashMap<>();
		response.put("statusCode", 200);
		response.put("body", "SQS Messages Processed Successfully");
		return response;
	}
}
