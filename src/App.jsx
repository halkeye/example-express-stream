import { useEffect, useReducer } from 'react'
import './App.css'

const initialState = {chunks: []};

function reducer(state, action) {
  switch (action.type) {
    case 'add_chunk':
      return {...state, chunks: [...state.chunks, action.value ]}
    default:
      throw new Error();
  }
}

async function fetchData(dispatch) {
  const response = await fetch('/api/foo')
  const body = response.body;
  const reader = body.getReader();
  let buffer = [];

  // read() returns a promise that resolves
  // when a value has been received
  reader.read().then(function processText({ done, value }) {
    // Result objects contain two properties:
    // done  - true if the stream has already given you all its data.
    // value - some data. Always undefined when done is true.
    if (done) {
      console.log("Stream complete", value);
      return;
    }
    buffer.push(...value)
    while (true) {
      const nullPos = buffer.indexOf(0);
      if (nullPos === -1) { break; }
      const chunk = buffer.splice(0, nullPos);
      buffer.splice(0, 1); // remove null
      console.log(`buffer=${JSON.stringify(buffer)} || chunk=${JSON.stringify(chunk)} || nullPos=${nullPos}`);
      dispatch({
        type: 'add_chunk',
        value:  String.fromCharCode.apply(null, chunk).trim()
      })
    }

    // Read some more, and call this function again
    return reader.read().then(processText);
  }).catch(console.error);
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => fetchData(dispatch), []);

  return (
    <div className="App">
      <header className="App-header">
        <p>Hello Vite + React!</p>
        <h3>Chunks</h3>
        <ul>
          {state.chunks.map((chunk, idx) =>  <li key={idx}>{chunk}</li>)}
        </ul>
      </header>
    </div>
  )
}

export default App

