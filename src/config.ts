export interface RequestOptions {
	/** Maximum request duration in milliseconds, including transport send and response. Defaults to 5000. */
	requestTimeout?: number;
}

export interface Config extends RequestOptions {
	errorHandler: (error: Error) => string;
}
