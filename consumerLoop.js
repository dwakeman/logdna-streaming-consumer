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
var cloudant = require('./cloudant');

var consumer;
var consumerLoop;

var exports = module.exports = {};
exports.consumerLoop = consumerLoop;

/**
 * Constructs a KafkaConsumer and registers listeners on the most common events
 * 
 * @param {object} Kafka - an instance of the node-rdkafka module
 * @param {object} consumer_opts - consumer configuration
 * @param {string} topicName - name of the topic to consumer from
 * @param {function} shutdown - shutdown function
 * @return {KafkaConsumer} - the KafkaConsumer instance
 */
exports.buildConsumer = function(Kafka, consumer_opts, topicName, shutdown) {
 
    logger.debug("in consumerLoop.js entering buildConsumer.....")
    var topicOpts = {
        'auto.offset.reset': 'latest'
    };

    consumer = new Kafka.KafkaConsumer(consumer_opts, topicOpts);

    // Register listener for debug information; only invoked if debug option set in driver_options
    consumer.on('event.log', function(log) {
        logger.debug(log);
    });

    // Register error listener
    consumer.on('event.error', function(err) {
        logger.error('Error from consumer:' + JSON.stringify(err));
    });

    var consumedMessages = []
    // Register callback to be invoked when consumer has connected
    consumer.on('ready', function() {
        logger.info('The consumer has connected.');

        // request metadata for one topic
        consumer.getMetadata({
            topic: topicName,
            timeout: 10000
        }, 
        function(err, metadata) {
            if (err) {
                logger.error('Error getting metadata: ' + JSON.stringify(err));
                shutdown(-1);
            } else {
                logger.info('Consumer obtained metadata: ' + JSON.stringify(metadata));
                if (metadata.topics[0].partitions.length === 0) {
                    logger.error('ERROR - Topic ' + topicName + ' does not exist. Exiting');
                    shutdown(-1);
                }
            }
        });

        consumer.subscribe([topicName]);

        consumerLoop = setInterval(function () {
            if (consumer.isConnected()) { 
                // The consume(num, cb) method can take a callback to process messages.
                // In this sample code we use the ".on('data')" event listener instead,
                // for illustrative purposes.
                consumer.consume(10);
            }    

            if (consumedMessages.length === 0) {
                logger.info('No messages consumed');
            } else {
                for (var i = 0; i < consumedMessages.length; i++) {
                    var m = consumedMessages[i];
                    logger.debug('in subscriber loop, writing message to database...')

                    // it may be an error in LogDNA, but need to verify if m.value is an object or a string
                    var mValue;
                    if (m.value.constructor === objectConstructor) {
                        mValue = JSON.parse(m.value.toString());
                    } else if (m.value.constructor === stringConstructor) {
                        mValue = { message: m.value }
                    }

                    logger.debug('The message to be inserted is: ' + JSON.stringify(mValue));
                    
                    cloudant.insert(mValue);
//                    cloudant.insert(JSON.parse(m.value.toString()));
                    logger.debug('Message consumed: topic=' + m.topic + ', partition=' + m.partition + ', offset=' + m.offset + ', key=' + m.key + ', value=' + m.value.toString());
                }
                consumedMessages = [];
            }
        }, 2000);
    });

    // Register a listener to process received messages
    consumer.on('data', function(m) {
        consumedMessages.push(m);
    });
    return consumer;
}
