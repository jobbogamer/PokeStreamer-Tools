export default class ImageFormat {
    constructor(extension, mimeType, search) {
        this._extension = extension;
        this._mimeType = mimeType || extension;
        this._searchStrings = !search ? extension : search.constructor === Array ? search : [ search ];
    }

    get extension() { return this._extension; }
    get mimeType() { return this._mimeType; }
    get searchStrings() { return this._searchStrings; }
}

function Img(...args) { return new ImageFormat(...args); }
export { Img };
