import express from "express";
import Alexa, { SkillBuilders } from 'ask-sdk-core';
import { ExpressAdapter } from 'ask-sdk-express-adapter';
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

// Alexa Handlers
const LaunchRequestHandler = {
    canHandle: (handlerInput) =>
        handlerInput.requestEnvelope.request.type === 'LaunchRequest',
    handle: (handlerInput) =>
        handlerInput.responseBuilder
            .speak('Ich bin RoBot, ihr digitaler Assistent der Stadt Rosenheim. Ich freue mich mich darauf, Ihnen bei Fragen der Stadt Rosenheim zu helfen. Wie kann ich helfen ?')
            .reprompt('Ich bin RoBot, ihr digitaler Assistent der Stadt Rosenheim. Ich freue mich mich darauf, Ihnen bei Fragen der Stadt Rosenheim zu helfen. Wie kann ich helfen ?')
            .getResponse()
};

const HelpIntentHandler = {
    canHandle: (handlerInput) =>
        Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent',
    handle: (handlerInput) =>
        handlerInput.responseBuilder
            .speak('How can I help you today?')
            .reprompt('Please let me know if you have a question or need assistance.')
            .getResponse()
};

const CancelAndStopIntentHandler = {
    canHandle: (handlerInput) =>
        Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent' ||
            Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent'),
    handle: (handlerInput) =>
        handlerInput.responseBuilder.speak('Goodbye!').getResponse()
};

const QuestionIntentHandler = {
    canHandle: (handlerInput) =>
        Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
        Alexa.getIntentName(handlerInput.requestEnvelope) === 'QuestionIntent',

    handle: async (handlerInput) => {
        try {
            const question = handlerInput.requestEnvelope.request.intent.slots.content.value;
            
            // Check if the question is provided
            if (!question) {
                return handlerInput.responseBuilder
                    .speak('I didn’t catch your question. Can you please ask again?')
                    .getResponse();
            }

            console.log('Received Question:', question);

            // Get the answer from the API
            const answer = await getAnswer(question);
            console.log('API Response:', answer);

            // If an answer is found, respond with it
            if (answer) {
                return handlerInput.responseBuilder
                    .speak(answer)
                    .getResponse();
            } else {
                // Fallback if no answer is returned
                return handlerInput.responseBuilder
                    .speak('I\'m sorry, I couldn\'t find an answer to your question. Please try again.')
                    .getResponse();
            }
        } catch (error) {
            console.error('Error in QuestionIntentHandler:', error);
            return handlerInput.responseBuilder
                .speak('Sorry, I encountered an issue while fetching the answer. Please try again later.')
                .getResponse();
        }
    }
};




const ErrorHandler = {
    canHandle: () => true,
    handle: (handlerInput, error) => {
        console.error('Error handled:', error);
        return handlerInput.responseBuilder
            .speak('Sorry, I encountered an issue. Please try again.')
            .getResponse();
    }
};

// Helper Function to Make API Call
// Helper Function to Make API Call
async function getAnswer(question) {
    try {
        const apiEndpoint = 'https://bot108.heimat24.de/apps/bot_findus-main/api/email/';
        const headers = { 'Content-Type': 'application/json' };

        console.log('Sending API Request:', { content: question });

        const response = await axios.post(apiEndpoint, { content: question }, { headers });

        console.log('API Response Status:', response.status);
        console.log('API Response Data:', response.data);

        // Check if the response contains the expected data
        if (response.status === 200 && response.data && response.data.answer) {
            console.log('API returned an answer:', response.data.answer);
            return response.data.answer;
        } else {
            console.error('Unexpected API Response:', response.data);
            return 'I could not find the answer to your question.';
        }
    } catch (error) {
        console.error('Error fetching answer from API:', error.message);
        console.error('Error Details:', error);
        return 'I encountered an error while fetching the answer.';
    }
}

// const FallbackHandler = {
//     canHandle: () => true, // Matches all unhandled requests
//     handle: (handlerInput) => {
//         console.log('Unhandled Request:', JSON.stringify(handlerInput.requestEnvelope, null, 2));
//         return handlerInput.responseBuilder
//             .speak('Sorry, I did not understand that. Please try again.')
//             .getResponse();
//     }
// };
// Create Alexa Skill
const skillBuilder = SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        QuestionIntentHandler,
        // FallbackHandler
    )
    .addErrorHandlers(ErrorHandler);

const skill = skillBuilder.create();
const adapter = new ExpressAdapter(skill, false, false);

// Express Configuration
app.post('/api/v1/webhook-alexa', adapter.getRequestHandlers());
app.use(express.json());

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
