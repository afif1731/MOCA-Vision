import os

def parse_size(env_key, default_val):
    val = os.getenv(env_key, str(default_val))
    val = val.strip('[]"\' ')
    if ',' in val:
        w, h = val.split(',')
        return (int(w.strip()), int(h.strip()))
    else:
        v = int(val)
        return (v, v)