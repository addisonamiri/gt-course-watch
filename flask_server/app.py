from flask import Flask
from flask import jsonify
import shelve
import os
import subprocess


app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello World!"

# Perform the Unix df -h command and send output as response
@app.route("/dfh")
def dfh():
    proc = subprocess.Popen(["df", "-h"], stdout=subprocess.PIPE, shell=True)
    (out, err) = proc.communicate()
    outlines = out.split('\n')
    ret_html = ''

    header_contents = ''
    for itm in outlines[0].split(' '):
        if itm:
            header_contents += "<th>{0}</th>".format(itm)

    header_html = "<tr>{0}</tr>".format(header_contents)
    ret_html += header_html

    for row in outlines[1:]:
        rowitms = row.split(' ')
        rowcontents = ''
        for itm in rowitms:
            if itm:
                rowcontents += "<td>{0}</td>".format(itm)
        rowhtml = '<tr>{0}</tr>'.format(rowcontents)
        ret_html += rowhtml 

    ret_html = "<html><body><table>{0}</table></body></html>".format(ret_html)

    # Simple method just inserting BRs
    # out = out.replace('\n', '<br>')
    return ret_html

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
