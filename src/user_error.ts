export class UserError extends Error {
	constructor(message: string) {
		super(message);

		this.name = 'UserError';

		if (
			typeof (Error as ErrorConstructor & { captureStackTrace?: unknown })
				.captureStackTrace === 'function'
		) {
			(
				Error as ErrorConstructor & {
					captureStackTrace: (
						targetObject: object,
						constructorOpt?: Function,
					) => void;
				}
			).captureStackTrace(this, UserError);
		}
	}
}
