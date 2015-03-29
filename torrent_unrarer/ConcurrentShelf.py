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
'fcntl' module. Thus the ConcurrentShelf will only work
on Unix systems, since fcntl was made for *nix.
'''

'''
Perform Atomic Operations on a shelve object
'''
class ConcurrentShelf(object):
    def __init__(self, shelvefile):
        self.shelvemgr = ShelveLocker(shelvefile)

    # Not-really atomic access get operation, since the lock 
    # obtained will be a shared lock... Other processes can also read, 
    # no writing though.
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

    # Atomic access set operation
    def set(self, k, v):
        self.shelvemgr.open('READWRITE')
        self.shelvemgr.shelve[k] = v
        self.shelvemgr.close()


'''
Lock manager class for shelve objects
'''
class ShelveLocker(object):
    def __init__(self, shelvefile):
        # The shelvefile 
        self.shelvefile = shelvefile

    def open(self, mode='READONLY'):
        if mode is 'READWRITE':
            lockfilemode = 'a' # Append
            lockmode = fcntl.LOCK_EX # Exclusive Lock
            shelve_mode = 'c' # Open shelf for reading and writing, creating it if it doesn’t exist
        else:
            lockfilemode = 'r' # Read
            lockmode = fcntl.LOCK_SH # Shared Lock
            shelve_mode = 'r' # Open existing database for reading only (default)

        # Open the lock file to get a file handle
        self.lockfd = open(self.shelvefile + ".lck", lockfilemode)
        # Obtain lock on the file handle, or block
        fcntl.flock(self.lockfd.fileno(), lockmode )
        # Open the shelf for mutation now that we have obtained lock
        self.shelve = shelve.open(self.shelvefile, flag=shelve_mode, protocol=pickle.HIGHEST_PROTOCOL)

    def close(self):
        # Close the shelf file
        self.shelve.close()
        # Release the lock on self.lockfd
        fcntl.flock(self.lockfd.fileno(), fcntl.LOCK_UN)
        # Close the lock file self.lockfd
        self.lockfd.close()


