export interface Config {
	errorHandler: (error: Error) => void;
	requestTimeout: number;
}
