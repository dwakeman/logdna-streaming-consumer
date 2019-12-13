/**
 * Copyright 2015-2018 IBM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/**
 * Licensed Materials - Property of IBM
 * © Copyright IBM Corp. 2015-2018
 */

const appName = require('./package').name;
const log4js = require('log4js');
const logger = log4js.getLogger(appName);
logger.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';
var cfenv = require('cfenv');
var appEnv = cfenv.getAppEnv();
var Cloudant = require('@cloudant/cloudant');

const DB_NAME = process.env.DB_NAME;

var exports = module.exports = {};

//var service = appEnv.getServiceCreds("cloudant-dallas-dw");
var credentials = appEnv.services.cloudantNoSQLDB[0].credentials;

logger.debug("[cloudant] - the cloudant service creds are " + JSON.stringify(credentials));
var cloudant = new Cloudant({ url: credentials.url, plugins: { iamauth: { iamApiKey: credentials.apikey } } });


var atdb = cloudant.db.use(DB_NAME);
logger.debug('[cloudant] - connected to database.');


exports.insert = function(doc)  {
    logger.debug('[cloudant] - inserting the event into the database...');    
    logger.debug('[cloudant] - the document to be added is: ' + JSON.stringify(doc));

    atdb.insert(doc)
    .then(addedDoc => {
//      console.log('Add event successful');

    })
    .catch(error => {
      logger.debug('[cloudant] - Add event failed with error: ' + JSON.stringify(error));

    });
}


