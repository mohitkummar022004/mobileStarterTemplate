/**
 * JSON-RPC 2.0 Standard Error Codes
 * @see https://www.jsonrpc.org/specification#error_object
 */

/**
 * Invalid JSON was received by the server.
 * An error occurred on the server while parsing the JSON text.
 */
export const JSONRPC_PARSE_ERROR = -32700;

/**
 * The JSON sent is not a valid Request object.
 */
export const JSONRPC_INVALID_REQUEST = -32600;

/**
 * The method does not exist / is not available.
 */
export const JSONRPC_METHOD_NOT_FOUND = -32601;

/**
 * Invalid method parameter(s).
 */
export const JSONRPC_INVALID_PARAMS = -32602;

/**
 * Internal JSON-RPC error.
 */
export const JSONRPC_INTERNAL_ERROR = -32603;

/**
 * Reserved for implementation-defined server-errors.
 * Range: -32000 to -32099
 */
export const JSONRPC_SERVER_ERROR_MIN = -32099;
export const JSONRPC_SERVER_ERROR_MAX = -32000;
