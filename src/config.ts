export interface Config {
	errorHandler: (error: Error) => string;
	requestTimeout?: number;
}
