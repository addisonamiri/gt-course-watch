import fcntl
import shelve
import time
import sys
import pickle

'''
@author Vikram Somu
@date 3/29/2015

A shelf that allows for concurrent accesses by
using atomic operations. The locking mechanism
to accomplish said 'atomic' operations is the 
'fcntl' module.
'''

'''
Perform Atomic Operations on a shelve object
'''
class ConcurrentShelf(object):
    def __init__(self, shelvefile):
        self.shelvemgr = ShelveLocker(shelvefile)

    def get(self, k):
        # try and open the shelf mgr in 'r' mode...
        # if the shelf file does not yet exist, an Exception will be thrown
        # if it exists, the value will attempted to be fetched
        # if the key doesn't exist, value of None will be returned
        try:
            self.shelvemgr.open()
            val = self.shelvemgr.shelve.get(k)
            self.shelvemgr.close()
            return val
        except:
            return None

    def set(self, k, v):
        self.shelvemgr.open('READWRITE')
        self.shelvemgr.shelve[k] = v
        self.shelvemgr.close()


'''
Lock manager class for shelve objects
'''
class ShelveLocker(object):
    def __init__(self, shelvefile):
        self.shelvefile = shelvefile

    def open(self, mode='READONLY'):
        if mode is 'READWRITE':
            lockfilemode = 'a' 
            lockmode = fcntl.LOCK_EX # Exclusive Lock
            shelve_mode = 'c'
        else:
            lockfilemode = 'r'
            lockmode = fcntl.LOCK_SH # Shared Lock
            shelve_mode = 'r'

        self.lockfd = open(self.shelvefile+".lck", lockfilemode)
        fcntl.flock(self.lockfd.fileno(), lockmode )
        self.shelve = shelve.open(self.shelvefile, flag=shelve_mode, protocol=pickle.HIGHEST_PROTOCOL)

    def close(self):
        self.shelve.close()
        fcntl.flock(self.lockfd.fileno(), fcntl.LOCK_UN) # Unlock lock
        self.lockfd.close()


