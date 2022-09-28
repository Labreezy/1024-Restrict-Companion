import sys
import frida
import os.path as osp
def on_msg(message, data):
    print(message)

if __name__ == '__main__':
    session = frida.attach("sonic2app.exe");
    script = session.create_script(open("script.js").read())
    script.on("message", on_msg)
    script.load()
    print("Choose safe color by typing in a number then hit enter.")
    print("1 - Blue")
    print("2 - Yellow")
    print("3 - Red")
    safecolor = input("Choice:")
    print("Choose to pick sets with or without replacement")
    print("1 - With replacement [default]")
    print("0 - Without replacement")
    replacement = int(input("Choice:") or 1)
    print("Ready to go!")
    msgdat = int(safecolor) - 1
    script.post({"type": "safe","id": msgdat})
    script.post({"type": "replacement", "data": replacement})
    if(osp.exists("sets.txt")):
        txtlines = open("sets.txt").read().strip().splitlines()
        ids = list(map(int, txtlines))
        script.post({"type": "sets","sets": ids})
    else:
        script.post({"type": "sets","sets": []})
    sys.stdin.read()

