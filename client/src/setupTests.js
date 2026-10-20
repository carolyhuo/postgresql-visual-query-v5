/* eslint @typescript-eslint/no-var-requires: off */
const { TextDecoder, TextEncoder } = require('util');
const { ReadableStream, TransformStream, WritableStream } = require('stream/web');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.ReadableStream = ReadableStream;
global.TransformStream = TransformStream;
global.WritableStream = WritableStream;

const { configure } = require('enzyme');
const AdapterModule = require('@wojtekmaj/enzyme-adapter-react-17');

const Adapter = AdapterModule.default || AdapterModule;

configure({ adapter: new Adapter() });
