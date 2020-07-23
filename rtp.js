// extracts rtp packets and dumps then text2pcap format for easy import in wireshark.
// usage:
// node rtp.js <file> | text2pcap -u 10000,20000 - some.pcap
//
// rtc_event_log2rtp_dump probably does a better job but requires a webrtc build.
const fs = require('fs');
const protobuf = require("protobufjs");
const logfile = fs.readFileSync(process.argv[2]);

function pad(num) {
    const s = '00000000' + num.toString(16);
    return s.substr(s.length - 8);
}

function strftime(time) {
    const time_h = Math.floor(time / 3.6e9);
    time -= time_h * 3.6e9;
    const time_m = Math.floor(time / 6e7);
    time -= time_m * 6e7;
    const time_s = Math.floor(time / 1e6);
    time -= time_s * 1e6;
    return time_h.toString() + ':' + time_m.toString() + ':' + time_s.toString()
        + '.' + ('000000' + time).substr(-6);
}

function directionStr(incoming) {
    if (incoming) {
        return 'I'
    } else {
        return 'O'
    }
}

let baseTime;
let hex;
let bytes;
let j;

protobuf.load("rtc_event_log.proto", function(err, root) {
    const events = root.lookup('webrtc.rtclog.EventStream').decode(logfile);
    events.stream.forEach(function(rawEvent) {
        const event = JSON.parse(JSON.stringify(rawEvent));
        event.timestampUs = Number(event.timestampUs);

        // Use first packet in any direction as base time
        if (event.timestampUs && baseTime === undefined) {
            baseTime = event.timestampUs;
        }

        let packet;
        switch(event.type) {
            case 'RTP_EVENT':
                packet = rawEvent.rtpPacket;

                console.log(directionStr(packet.incoming) + strftime(event.timestampUs - baseTime));

                // dump in rtpdump format.
                hex = packet.header.toString('hex');
                bytes = '';
                for (j = 0; j < hex.length; j += 2) {
                    bytes += hex[j] + hex[j+1] + ' ';
                }
                // add null payload
                for (j = 0; j < packet.packetLength; j++) {
                    bytes += '00 ';
                }
                console.log(pad(0) + ' ' + bytes.trim());
                break;

            case 'RTCP_EVENT':
                packet = rawEvent.rtcpPacket;

                console.log(directionStr(packet.incoming) + strftime(event.timestampUs - baseTime));

                hex = packet.packetData.toString('hex');
                bytes = '';
                for (j = 0; j < hex.length; j += 2) {
                    bytes += hex[j] + hex[j+1] + ' ';
                }
                console.log(pad(0) + ' ' + bytes.trim());
                break;
        }
    });
});


