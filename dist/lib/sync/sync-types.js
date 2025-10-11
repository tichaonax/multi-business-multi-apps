"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictType = exports.ResolutionStrategy = exports.SyncOperation = void 0;
var SyncOperation;
(function (SyncOperation) {
    SyncOperation["CREATE"] = "CREATE";
    SyncOperation["UPDATE"] = "UPDATE";
    SyncOperation["DELETE"] = "DELETE";
})(SyncOperation || (exports.SyncOperation = SyncOperation = {}));
var ResolutionStrategy;
(function (ResolutionStrategy) {
    ResolutionStrategy["TIMESTAMP"] = "TIMESTAMP";
    ResolutionStrategy["PRIORITY"] = "PRIORITY";
    ResolutionStrategy["MANUAL"] = "MANUAL";
    ResolutionStrategy["MERGE"] = "MERGE";
    ResolutionStrategy["SOURCE_WINS"] = "SOURCE_WINS";
    ResolutionStrategy["TARGET_WINS"] = "TARGET_WINS";
    ResolutionStrategy["CUSTOM"] = "CUSTOM";
})(ResolutionStrategy || (exports.ResolutionStrategy = ResolutionStrategy = {}));
var ConflictType;
(function (ConflictType) {
    ConflictType["CREATE_CREATE"] = "CREATE_CREATE";
    ConflictType["UPDATE_UPDATE"] = "UPDATE_UPDATE";
    ConflictType["UPDATE_DELETE"] = "UPDATE_DELETE";
    ConflictType["DELETE_UPDATE"] = "DELETE_UPDATE";
    ConflictType["CONSTRAINT"] = "CONSTRAINT";
})(ConflictType || (exports.ConflictType = ConflictType = {}));
