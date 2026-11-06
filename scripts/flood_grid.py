"""Small helper to read the flood grid produced by build_dem.py."""
import json, gzip, os, numpy as np
D = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'flood')
class Grid:
    def __init__(self):
        self.idx = json.load(open(os.path.join(D, 'index.json')))
        raw = gzip.open(os.path.join(D, 'grid.bin.gz')).read()
        C = self.C = self.idx['chunk']; self.res = self.idx['res']
        self.W, self.S, self.E_, self.N = self.idx['bounds']
        rows = int(round((self.N - self.S) / self.res)); cols = int(round((self.E_ - self.W) / self.res))
        self.F = np.full((rows + C, cols + C), 99.0, np.float32); self.E = np.full_like(self.F, 99.0)
        self.sea = np.zeros(self.F.shape, bool)
        for c in self.idx['chunks']:
            e = np.frombuffer(raw, np.uint8, C * C, c['off']).reshape(C, C)
            d = np.frombuffer(raw, np.uint8, C * C, c['off'] + C * C).reshape(C, C)
            sl = (slice(c['row'], c['row'] + C), slice(c['col'], c['col'] + C))
            self.E[sl] = np.where(e == 255, -1, e / 10 - 1)
            self.F[sl] = np.where(e == 255, -1, (e.astype(int) + d) / 10 - 1)
            self.sea[sl] = e == 255
    def rc(self, lon, lat):
        r = np.floor((self.N - np.asarray(lat)) / self.res).astype(int)
        c = np.floor((np.asarray(lon) - self.W) / self.res).astype(int)
        ok = (r >= 0) & (c >= 0) & (r < self.F.shape[0]) & (c < self.F.shape[1])
        return np.clip(r, 0, self.F.shape[0] - 1), np.clip(c, 0, self.F.shape[1] - 1), ok
