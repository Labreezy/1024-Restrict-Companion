import sys
import frida
import json
import os.path as osp
confirmed_display = -1
def on_msg(message, data):

    if message["type"] == "send":
        if len(message['payload']) == 2 and confirmed_display == 1:
            set_id = message["payload"][1]
            if set_id >= 0:
                stage_id = str(message['payload'][0])
                stage_sets = SET_DATA[stage_id]
                p1, p2, p3 = stage_sets[set_id]
                sets_with_combo = [s for s in stage_sets if s[0]==p1 and s[1]==p2]
                if len(sets_with_combo) == 1:
                    print("Set is confirmed")
                else:
                    print(f"P1/2 does not confirm P3, {len(sets_with_combo)} Possibilities:")
                    sorted_with_combo = sorted(sets_with_combo,key=lambda s: s[-1])
                    for hints in sorted_with_combo:
                        print("//".join(hints))
                print("-----")

    else:
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
    print("Choose to display live confirmed set data")
    print("1 - Yes")
    print("2 - No")
    confirmed_display = int(input("Choice:") or 2)

    SET_DATA = json.load(open('1024_data.json'))
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

