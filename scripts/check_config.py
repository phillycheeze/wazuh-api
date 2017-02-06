#!/usr/bin/env python

# Created by Wazuh, Inc. <info@wazuh.com>.
# This program is a free software; you can redistribute it and/or modify it under the terms of GPLv2

import subprocess
import json
import os

if __name__ == "__main__":
    ossec_path = "/var/ossec"
    r_error = 0
    r_message = ""
    r_data = ""
    
    output = ""
    err = ""
    try:
        p = subprocess.Popen(["{0}/bin/ossec-logtest".format(ossec_path), "-t"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        (output, err) = p.communicate()

        lines = err.split(os.linesep)
        error_line = 0
        for l in lines:
            if "error" in l.lower():
                break
            else:
                error_line += 1

        if err:
            if "Error" in err:
                r_error = 82
                r_message = "{0}".format(lines[error_line:-1])
            else:
                r_error = 0
                r_data = "OK"
        else:
            r_error = 81
            r_message = "Error unknown."
    except Exception as e:
        r_error = 80
        r_message = "Problem running command: {0}".format(e)

    # Response
    response = {'error': r_error}
    if r_error == 0:
        response['data'] = r_data
    else:
        response['message'] = r_message

    print(json.dumps(response))