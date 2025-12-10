const mongoose = require('mongoose');

// Helper function to convert multiple Mongoose documents to plain objects
const multipleMongooseToObject = function (documents) {
    return documents.map(doc => doc.toObject());
};

// Helper function to convert single Mongoose document to plain object
const mongooseToObject = function (document) {
    return document ? document.toObject() : document;
};

module.exports = {
    multipleMongooseToObject,
    mongooseToObject,
};
