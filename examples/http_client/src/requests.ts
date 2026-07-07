import { Receiver, UserError } from '@liphium/neoroute-ts';
import { type TestRequest, type TestResponse } from './messages.js';

export async function testHttpSimple(receiver: Receiver): Promise<void> {
	try {
		console.log('Sending simple HTTP request...');
		const resp = receiver.sendNoRequest<TestResponse>('simple.route');
		console.log('Simple HTTP Response:', resp);
	} catch (err) {
		if (err instanceof UserError) {
			console.log('UserError on simple route:', err.message);
		} else {
			console.log('System error on simple route:', err);
		}
	}
}

export async function testHttpGroup1(
	receiver: Receiver,
	numberValue: number,
): Promise<void> {
	try {
		console.log('Sending group1 HTTP request...');
		const req: TestRequest = {
			field1: 'Testing Group 1',
			field2: numberValue,
		};
		const resp = receiver.send<TestResponse, TestRequest>(
			'group1.route1',
			req,
		);
		console.log('Group 1 HTTP Response:', resp);
	} catch (err) {
		if (err instanceof UserError) {
			console.log('UserError on group1 route:', err.message);
		} else {
			console.log('System error on group1 route:', err);
		}
	}
}

export async function testHttpGroup2(
	receiver: Receiver,
	numberValue: number,
): Promise<void> {
	try {
		console.log('Sending group2 HTTP request...');
		const req: TestRequest = {
			field1: 'Testing Group 2',
			field2: numberValue,
		};
		const resp = await receiver.send<TestResponse, TestRequest>(
			'group1.group2.route1',
			req,
		);
		console.log('Group 2 HTTP Response:', resp);
	} catch (err) {
		if (err instanceof UserError) {
			console.log('UserError on group2 route:', err.message);
		} else {
			console.log('System error on group2 route:', err);
		}
	}
}
