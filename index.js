const functions = require('firebase-functions');
const dialogflow = require('dialogflow');
const uuid = require('uuid')
const authConfig = {
    keyFilename: './service-account.json',
    scopes: 'https://www.googleapis.com/auth/cloud-platform'
};

// const sessionId = uuid.v4();
const sessionClient = new dialogflow.SessionsClient(authConfig);
const sessionPath = sessionClient.sessionPath('edubot-training-oavcub', Date.now().toString());
// const intent = new dialogflow.v2beta1.IntentsClient()
const entities = new dialogflow.v2beta1.EntityTypesClient(authConfig);



const admin = require('firebase-admin');
admin.initializeApp();


function getEntitiesList() {
    return new Promise((resolve, reject) => {
        entities.listEntityTypes({ parent: 'projects/edubot-training-oavcub/agent' })
            .then((response) => {
                resolve(response);
                return;
            }).catch((err) => {
                console.log('An error occured in getting list of all entities')
                reject(err);
            });
    })

}

function insertWithinEntity(program, entityList) {
    return new Promise((resolve, reject) => {
        let entity = {
            "synonyms": [
                program
            ],
            "value": program
        };
        entityList.entities.push(entity);
        let updateSchema = {
            entityType: entityList
        };
        entities.updateEntityType(updateSchema)
            .then((response) => {
                resolve(response)
                return;
            })
            .catch((err) => {
                reject(err);
            })
    });
}

function insertIfNewProgramAdded(entityList, updatedProgram) {
    return new Promise((resolve, reject) => {
        let programs = entityList.entities;
        for (let program of programs) {
            if (program.value === updatedProgram.name) {
                // Ignore the insertion as program is already defined in entities
                return reject('No Changes Required');
            }
        }
        return insertWithinEntity(updatedProgram.name, entityList).then(res => {
            resolve(res);
        }).catch(err => {
            reject(err);
        });
    });
}

exports.update = functions
    .firestore
    .document('/program/{programId}')
    .onWrite((change, context) => {
        let updatedData = change.after.data();
        if (updatedData) {
            return getEntitiesList().then(entityList => {
                let programs = entityList[0][0];
                insertIfNewProgramAdded(programs, updatedData);
            }).catch(err => console.log(err));

        } else {
            console.log(`No Changes In Dialogflow`);
        }
    })