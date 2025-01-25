# Recommended Upstream Changes

[Previous content remains the same until Message Type Changes section, then add:]

### 5. Audio Messages
```json
{
  "type": "audio",
  "audio": {
    "sys_name": "butco2",
    "data": {
      "wav_base64": "Uk==",
      "format": "wav",
      "path": {
        "dir": "/path/to/audio",
        "filename": "9131-1737430014_851350000.0-call_1571.wav"
      }
    },
    "frequency": {
      "current": 851350000,
      "error": 176,
      "history": [
        {
          "freq": 851350000,
          "time": 1737430015,
          "position": 0,
          "duration": 2.7,
          "error_count": 1,
          "spike_count": 0
        }
      ]
    },
    "signal": {
      "strength": 999,
      "noise": 999,
      "priority": 4
    },
    "sources": [
      {
        "id": 976109,
        "time": 1737430015,
        "position": 0,
        "is_emergency": false,
        "signal_system": "",
        "tag": ""
      }
    ],
    "talkgroup": {
      "id": 9131,
      "alpha_tag": "09 WC HOSP SEC",
      "tag": "Security",
      "description": "UC Health West Chester Hospital - Security",
      "group": "Butler County (09) Fire/EMS/Hospitals"
    },
    "flags": {
      "is_emergency": false,
      "is_encrypted": false,
      "is_phase2_tdma": false,
      "is_duplex": false
    },
    "timing": {
      "start_time": 1737430015,
      "stop_time": 1737430023,
      "duration_seconds": 6
    }
  }
}
```

## Additional Field Standards

### 1. Boolean Values
```diff
// Use true/false instead of 0/1
- "emergency": 0,
- "encrypted": 0,
- "phase2_tdma": 0
+ "is_emergency": false,
+ "is_encrypted": false,
+ "is_phase2_tdma": false
```

### 2. Signal Quality Fields
```diff
// Group signal-related fields
- "signal": 999,
- "noise": 999,
- "freq_error": 176
+ "signal": {
+   "strength": 999,
+   "noise": 999,
+   "error": 176
+ }
```

### 3. History Lists
```diff
// Standardize list field names
- "freqList": []
- "srcList": []
+ "frequency_history": []
+ "source_history": []
```

### 4. Position/Duration Fields
```diff
// Use consistent naming
- "pos": 0,
- "len": 2.7
+ "position": 0,
+ "duration": 2.7
```

## Value Objects

```cpp
// Signal quality information
struct SignalInfo {
    int strength;
    int noise;
    int error;
    int priority;
    
    json toJSON() {
        return {
            {"strength", strength},
            {"noise", noise},
            {"error", error},
            {"priority", priority}
        };
    }
};

// Frequency history entry
struct FrequencyHistoryEntry {
    uint64_t freq;
    time_t time;
    double position;
    double duration;
    int error_count;
    int spike_count;
    
    json toJSON() {
        return {
            {"freq", freq},
            {"time", time},
            {"position", position},
            {"duration", duration},
            {"error_count", error_count},
            {"spike_count", spike_count}
        };
    }
};

// Audio data container
struct AudioData {
    std::string wav_base64;
    std::string format;
    std::string filename;
    
    json toJSON() {
        return {
            {"wav_base64", wav_base64},
            {"format", format},
            {"path", {
                {"filename", filename}
            }}
        };
    }
};
```

## Message Classes

```cpp
class AudioMessage : public Message {
private:
    AudioData audio;
    SignalInfo signal;
    std::vector<FrequencyHistoryEntry> frequency_history;
    std::vector<SourceHistoryEntry> source_history;
    TalkgroupInfo talkgroup;
    
protected:
    json getPayload() override {
        return {
            {"data", audio.toJSON()},
            {"signal", signal.toJSON()},
            {"frequency_history", json::array()},  // Convert vector to JSON array
            {"source_history", json::array()},     // Convert vector to JSON array
            {"talkgroup", talkgroup.toJSON()}
        };
    }
    
public:
    AudioMessage(
        AudioData audio,
        SignalInfo signal,
        std::vector<FrequencyHistoryEntry> freq_history,
        std::vector<SourceHistoryEntry> src_history,
        TalkgroupInfo talkgroup
    ) : Message("audio"),
        audio(audio),
        signal(signal),
        frequency_history(freq_history),
        source_history(src_history),
        talkgroup(talkgroup) {}
};
```

[Previous content remains the same from Implementation Strategy section onwards]
