export class Ctx {
	private _data: Uint8Array;
	private _name: string;

	constructor(data: Uint8Array, name: string) {
		this._data = data;
		this._name = name;
	}

	public data(): Uint8Array {
		return this._data;
	}

	public name(): string {
		return this._name;
	}
}
