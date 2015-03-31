from flask import Flask
from flask import jsonify
import shelve
import os

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello World!"

@app.route("/peekdl")
def peekdl():
    try:
        folder_memdb_fp = os.environ["FOLDER_MEMDB_FP"]
        folder_mem_shelf = shelve.open(
            folder_memdb_fp, 
            flag='r'
        )
        return jsonify(folder_mem_shelf)
    except Exception, e:
        # print str(e)
        return "Error accessing folder_mem.db"

if __name__ == "__main__":
    # host='0.0.0.0' makes the server externally visible
    # since we are listening on all possible IP addresses
    app.run(host='0.0.0.0', debug=True)
