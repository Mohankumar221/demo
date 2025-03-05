package com.task02;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.syndicate.deployment.annotations.lambda.LambdaHandler;
import com.syndicate.deployment.model.RetentionSetting;

import java.util.HashMap;
import java.util.Map;

@LambdaHandler(
		lambdaName = "hello_world",
		roleName = "hello_world-role",
		isPublishVersion = true,
		aliasName = "${lambdas_alias_name}",
		logsExpiration = RetentionSetting.SYNDICATE_ALIASES_SPECIFIED
)
public class HelloWorld implements RequestHandler<APIGatewayProxyRequestEvent, Map<String, Object>> {

	public Map<String, Object> handleRequest(APIGatewayProxyRequestEvent request, Context context) {
		Map<String, Object> resultMap = new HashMap<String, Object>();
		String path = request.getPath();
		String method = request.getHttpMethod();

		if("/hello".equals(path)) {
			System.out.println("Hello from lambda");
			resultMap.put("statusCode", 200);
			resultMap.put("message", "Hello from Lambda");
		}
		else {
			System.out.println("Hello from lambda");
			resultMap.put("statusCode", 400);
			resultMap.put("message", String.format(
					"Bad request syntax or unsupported method. Request path: %s. HTTP method: %s",
					path, method
			));
		}
		return resultMap;
	}

}