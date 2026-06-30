export interface Logger {
	debug(msg: string, ...args: any[]): void;
	info(msg: string, ...args: any[]): void;
	warn(msg: string, ...args: any[]): void;
	error(msg: string, ...args: any[]): void;
}

// Default logger falls back to the standard console
export let logger: Logger = {
	debug: console.debug,
	info: console.info,
	warn: console.warn,
	error: console.error,
};

export function setLogger(l: Logger) {
	logger = l;
}
