import subprocess
import re
import sys

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

    def __init__(self, sourcefp, qual):
        self.midqual_generic_cmd = "ffmpeg -y -i {inputfp} -vcodec libvpx -acodec libvorbis {outputfp}"
        self.highqal_centos7_cmd = "ffmpeg -y -i {inputfp} -codec:v libvpx -quality good -cpu-used 0 -b:v 500k -qmin 10 -qmax 42 -maxrate 500k -bufsize 1000k -threads 4 -vf scale=-1:480 -codec:a libvorbis -b:a 128k {outputfp}"
        # To extract time data from a string such as 
        # frame=   13 fps=2.3 q=0.0 size=    8292kB time=00:00:00.69 bitrate=97313.6kbits/s
        # Extracted data: '00:00:00.69'
        self.time_re = "time=((?:[0-9]{2}(?:\:|\.)*)+)"
        self.duration_re = "Duration: ((?:[0-9]{2}(?:\:|\.)*)+)"
        self.video_re = "(.*\.(?:mp4|m4v|mkv|avi|flv))$"

        self.sourcefp = sourcefp
        self.quality = qual

    # Loop through files in sourcefp looking for video content
    # for each found video, issue an ffmpeg shell command to convert to .webm
    def scan_sourcefp(self):
        pass

    def test_out(self):
        base = '/Users/vikram/Desktop/Drugs.Inc.S01.to.S03.720p/Drugs.Inc.S01.720p.HDTV.DD5.1.x264-DON/'
        infn = 'National.Geographic.Drugs.Inc.S01E01.Cocaine.720p.HDTV.DD5.1.x264-DON.mkv'
        cmd = self.midqual_generic_cmd.format(inputfp=base+infn, outputfp=base+'out.webm')

        child = subprocess.Popen(cmd, shell=True, stderr=subprocess.PIPE)
        while True:
            out = child.stderr.read(1024)
            if out == '' and child.poll() != None:
                break
            if out != '':

                durationd = re.search(self.duration_re, out)
                if durationd:
                    durationd = durationd.groups()[0]
                    print 'NARF3', durationd

                timed = re.search(self.time_re, out)
                if timed:
                    timed = timed.groups()[0]
                    print 'NARF1', timed
                    # print 'NARF2', out
                # sys.stdout.write(out)
                # sys.stdout.flush()
                pass

        # proc = subprocess.Popen(cmd,stdout=subprocess.PIPE, shell=True)

        # while True:
        #   line = proc.stdout.readline()
        #   if line != '':
        #     #the real code does filtering here
        #     print "NARF:", line.rstrip()
        #   else:
        #     break

w = WebMConverter('z', 'high')
w.test_out()