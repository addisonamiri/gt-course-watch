import subprocess
import re
import sys
import os
import shelve

'''
@author Vikram Somu
@date 3/29/2015

DEPENDENCIES: 'ffmpeg' unix command line tool

This is a script to convert all video files in a certain directory
to webm. 
'''

# Take as input a sourcefp to scan for video content
# Video content defined: .mp4, .m4v, .mkv, .avi, .flv
# The ?: in the beginning of the inner match group, makes it so that
# group is a non-matching group, meaning its matches wont be returned.
# It is solely used for grouping.
# re.match('(.*\.(?:mp4|m4v|mkv|avi|flv))$', 'haha.avi')

class WebMConverter(object):

    def __init__(self, qual):
        self.midqual_generic_cmd = "ffmpeg -y -i {inputfp} -vcodec libvpx -acodec libvorbis {outputfp}"
        self.highqal_centos7_cmd = "ffmpeg -y -i {inputfp} -codec:v libvpx -quality good -cpu-used 0 -b:v 500k -qmin 10 -qmax 42 -maxrate 500k -bufsize 1000k -threads 4 -vf scale=-1:480 -codec:a libvorbis -b:a 128k {outputfp}"

        # To extract time data from a string such as 
        # 'frame=   13 fps=2.3 q=0.0 size=    8292kB time=00:00:00.69 bitrate=97313.6kbits/s'
        # Extracted data: '00:00:00.69'
        self.time_re = "time=((?:[0-9]{2}(?:\:|\.)*)+)"
        # Extract '00:45:56.48' from 'Duration: 00:45:56.48, start: 0.000000, bitrate: 4484 kb/s'
        self.duration_re = "Duration: ((?:[0-9]{2}(?:\:|\.)*)+)"
        # Extract entire video name if one of the formats matches
        self.video_re = "(.*\.(?:mp4|m4v|mkv|avi|flv))$"

        self.quality = qual
        self.shelvefnstr = "webm_prog"

    # Loop through files in sourcefp directory looking for video content
    # for each found video, issue an ffmpeg shell command to convert to .webm
    def scan_sourcefp(self, sourcefp):
        # If sourcefp is not a dir, break flow of execution
        if not os.path.isdir(sourcefp):
            return

        for file in os.listdir(sourcefp):
            fp = sourcefp + '/' + file
            if re.match(self.video_re, fp):
                # Found a video file, commence child process execution / monitoring
                self.ffmpeg_proc_exec(fp)


    # Execute/Monitor a single ffmpeg subprocess to convert 1 video file.
    # We track real-time progress of said conversion using process 
    # communication through stdout and update said progress in a shelf.
    def ffmpeg_proc_exec(self, fp):
        # Construct output file name from input file
        fp_fn = fp.split('/')[-1] # Name of video file
        outf = '.'.join(fp_fn.split('.')[:-1]) + '.webm' # Constructed output file name
        containing_dir_fp = '/'.join(fp.split('/')[:-1]) # Name of containing directory for input/ouput

        # Assemble ffmpeg shell command
        cmd = self.midqual_generic_cmd.format(
            inputfp=fp, 
            outputfp=containing_dir_fp + '/' + outf
        )

        # ffmpeg directs progress info to stderr
        child = subprocess.Popen(cmd, shell=True, stderr=subprocess.PIPE)

        duration_found = False

        while True:
            # Lowering the buffer-size param to the read method makes the 
            # data come back faster since a smaller buffer size must be filled up
            # before read() can return. The most responsive is to have a buffer size 
            # of only 1 by using child.stderr.read(1)
            # ffmpeg happens to output progress to stderr, but this works same for stdout
            out = child.stderr.read(1024)
            if out == '' and child.poll() != None:
                break
            if out != '':
                if not duration_found:
                    durationg = re.search(self.duration_re, out) # duration groups

                    if durationg:
                        durationd = durationg.groups()[0]
                        self.set_shelve_val(fp_fn, 'duration', durationd)

                timeg = re.search(self.time_re, out) # time groups
                if timeg:
                    timed = timeg.groups()[0]
                    self.set_shelve_val(fp_fn, 'time_complete', timed)

                # To send stdout of child on to console that executed python:
                # sys.stdout.write(out)
                # sys.stdout.flush()

        shelvef.close()

    def set_shelve_val(self, k, vstr, v):
        shelvef = shelve.open(self.shelvefnstr, flag='c')

        if shelvef.dict.has_key(k):
            curv = shelvef[k]
        else:
            curv = {}

        curv[vstr] = v
        shelvef[k] = curv

        shelvef.close()    


def main():
    pass

w = WebMConverter('high')
w.scan_sourcefp('/Users/vikram/Desktop/Drugs.Inc.S01.to.S03.720p/Drugs.Inc.S01.720p.HDTV.DD5.1.x264-DON')





