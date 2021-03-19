/* eslint-disable no-unused-vars */
/* eslint-disable object-curly-spacing */
/* eslint-disable indent */
/* eslint-disable comma-dangle */
/* eslint-disable arrow-parens */
/* eslint-disable quotes */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// auth trigger (new user signup)
exports.newUserSignup = functions.auth.user().onCreate(user => {
  return admin.firestore().collection('users').doc(user.uid).set({
    email: user.email,
    upvotedOn: []
  });
});

// auth trigger (deleted user)
exports.userDeleted = functions.auth.user().onDelete(user => {
  const doc = admin.firestore().collection('users').doc(user.uid);
  return doc.delete();
});

// http callable function (adding a request)
exports.addRequest = functions.https.onCall((data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Please log in first'
    );
  }
  if (data.text.length > 30) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'request mut no more than 30 characters long'
    );
  }
  return admin.firestore().collection('requests').add({
    text: data.text,
    upvotes: 0
  });
});

// upvote callable function
exports.upvote = functions.https.onCall(async (data, context) => {
  // check auth state
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Please log in first'
    );
  }
  // get refs for user doc and request doc
  const user = admin.firestore().collection('users').doc(context.auth.uid);
  const request = admin.firestore().collection('requests').doc(data.id);

  const doc = await user.get();
  // check user hasn't already upvoted the request
  if (doc.data().upvotedOn.includes(data.id)) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'You can vote only once!'
    );
  }

  // update user array
  await user.update({
    upvotedOn: [...doc.data().upvotedOn, data.id]
  });

  return request.update({
    upvotes: admin.firestore.FieldValue.increment(1)
  });
});

// firestore trigger for tracking activity
exports.logActivities = functions.firestore
  .document('/{collection}/{id}')
  .onCreate((snap, context) => {
    console.log(snap.data());

    const collection = context.params.collection;
    const id = context.params.id;

    const activities = admin.firestore().collection('activities');

    if (collection === 'requests') {
      return activities.add({ text: 'a new tutorial request was added' });
    }
    if (collection === 'users') {
      return activities.add({ text: 'a new user was registered' });
    }

    return null;
  });

// // http request 1

// exports.randomNumber = functions.https.onRequest((req, res) => {
//   const number = Math.round(Math.random() * 100);
//   console.log(number);
//   res.send(number.toString());
// });

// // http request 2

// exports.toTheDojo = functions.https.onRequest((req, res) => {
//   res.redirect('https://www.github.com/posiek07');
// });

// // http collable function
// exports.sayHello = functions.https.onCall((data, context) => {
//   const name = data.name;
//   return `hello, ${name}`;
// });
