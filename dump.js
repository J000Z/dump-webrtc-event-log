const fs = require('fs');
const protobuf = require("protobufjs");
const logfile = fs.readFileSync(process.argv[2]);

// https://webrtc.googlesource.com/src/+/refs/heads/master/logging/rtc_event_log/rtc_event_log.proto
protobuf.load("rtc_event_log.proto", function(err, root) {
    const events = root.lookup('webrtc.rtclog.EventStream').decode(logfile);
    console.log(JSON.stringify(events, null, ' '));
});

