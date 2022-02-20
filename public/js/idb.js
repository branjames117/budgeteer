// indexedDB to hold offline db queries until connectivity is restored

let db;

// create request to act as event listener for the database
const request = indexedDB.open('budgeteer', 1);

// emit if the db version changes
request.onupgradeneeded = (e) => {
  // save reference to db
  db = e.target.result;

  // create object store with autoincrementing pk. this only runs once.
  db.createObjectStore('new_transaction', { autoIncrement: true });
};

// upon successful connection
request.onsuccess = (e) => {
  db = e.target.result;

  // check if app is online, if yes, run uploadTransaction() to update mongodb
  if (navigator.onLine) {
    uploadTransaction();
  }
};

request.onerror = (e) => {
  console.log(e.target.errorCode);
};

// execute if new transaction is submitted while offline
function saveRecord(record) {
  // open new transaction with db with read and write permissions
  const transaction = db.transaction(['new_transaction'], 'readwrite');

  // access object store
  const transactionObjectStore = transaction.objectStore('new_transaction');

  // add record to store
  transactionObjectStore.add(record);
}

function uploadTransaction() {
  const transaction = db.transaction(['new_transaction'], 'readwrite');
  const transactionObjectStore = transaction.objectStore('new_transaction');

  // get all records from store
  const getAll = transactionObjectStore.getAll();

  // upon successful .getAll() execution...
  getAll.onsuccess = () => {
    // if there's data in idb's store, send it to api server
    if (getAll.result.length > 0) {
      fetch('/api/transaction', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.message) {
            throw new Error(data);
          }

          const transaction = db.transaction(['new_transaction'], 'readwrite');
          const transactionObjectStore =
            transaction.objectStore('new_transaction');

          // clear all items in store
          transactionObjectStore.clear();

          alert('All saved transactions have been uploaded!');
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };
}
