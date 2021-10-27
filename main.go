package main

import (
	"flag"
  "github.com/pkg/errors"
  "os"
	"strconv"
  "strings"

  "github.com/markbates/pkger"
	"github.com/owncast/owncast/logging"
	log "github.com/sirupsen/logrus"

	"github.com/owncast/owncast/config"
	"github.com/owncast/owncast/core"
	"github.com/owncast/owncast/core/data"
	"github.com/owncast/owncast/metrics"
	"github.com/owncast/owncast/router"
	"github.com/owncast/owncast/utils"
)

func main() {
	// Enable bundling of admin assets
	_ = pkger.Include("/admin")

	dbFile := flag.String("database", "", "Path to the database file.")
	logDirectory := flag.String("logdir", "", "Directory where logs will be written to")
	backupDirectory := flag.String("backupdir", "", "Directory where backups will be written to")
	enableDebugOptions := flag.Bool("enableDebugFeatures", false, "Enable additional debugging options.")
	enableVerboseLogging := flag.Bool("enableVerboseLogging", false, "Enable additional logging.")
  setOptionsOnly := flag.Bool("setOptionsOnly", false, "Exit after options are set.")
	restoreDatabaseFile := flag.String("restoreDatabase", "", "Restore an Owncast database backup")
	webServerPortOverride := flag.String("webserverport", "", "Force the web server to listen on a specific port")
	webServerIPOverride := flag.String("webserverip", "", "Force web server to listen on this IP address")
	rtmpPortOverride := flag.Int("rtmpport", 0, "Set listen port for the RTMP server")
  serverName := flag.String("serverName", "", "Set server name")
  newStreamKey := flag.String("streamKey", "", "Set your stream key/admin password")
  newStreamKeyFile := flag.String("streamKeyFile", "", "Set your stream key/admin password")

  if *serverName == ""{
    if f, ok := os.LookupEnv("OWNCAST_SERVER"); ok{
      *serverName = f
    }
  }

  if *webServerPortOverride == ""{
    if f, ok := os.LookupEnv("WEBSERVER_PORT"); ok{
      *webServerPortOverride = f
    }
  }

  if *rtmpPortOverride == 0 {
    if f, ok := os.LookupEnv("RTMP_PORT"); ok{
      *rtmpPortOverride, _ = strconv.Atoi(f)
    }
  }

  if *newStreamKey == ""{
    if *newStreamKeyFile == ""{
      if f, ok := os.LookupEnv("OWNCAST_KEY_FILE"); ok{
        *newStreamKeyFile = f
      }
    }
    if *newStreamKeyFile != ""{
      key, err := os.ReadFile(*newStreamKeyFile)
      if err!=nil{
        log.Fatalln(err)
      }
      *newStreamKey = strings.TrimSpace(strings.Trim(string(key), "\n"))
      log.Infoln("Stream key file found", *newStreamKeyFile)
    }
  }

  flag.Parse()

	if *logDirectory != "" {
		config.LogDirectory = *logDirectory
	}

	if *backupDirectory != "" {
		config.BackupDirectory = *backupDirectory
	}

	// Create the data directory if needed
	if !utils.DoesFileExists("data") {
		if err := os.Mkdir("./data", 0700); err != nil {
			log.Fatalln("Cannot create data directory", err)
		}
	}

	configureLogging(*enableDebugOptions, *enableVerboseLogging)
	log.Infoln(config.GetReleaseString())

	// Allows a user to restore a specific database backup
	if *restoreDatabaseFile != "" {
		databaseFile := config.DatabaseFilePath
		if *dbFile != "" {
			databaseFile = *dbFile
		}

		if err := utils.Restore(*restoreDatabaseFile, databaseFile); err != nil {
			log.Fatalln(err)
		}

		log.Println("Database has been restored.  Restart Owncast.")
		log.Exit(0)
	}

	config.EnableDebugFeatures = *enableDebugOptions

	if *dbFile != "" {
		config.DatabaseFilePath = *dbFile
	}

	go metrics.Start()

	if err := data.SetupPersistence(config.DatabaseFilePath); err != nil {
		log.Fatalln("failed to open database", err)
	}

	if *newStreamKey != "" {
	  if len(*newStreamKey) < 5 {
      log.Fatalln(errors.Errorf("StreamKey is invalid. Length must be larger then 4 chars. '%s", newStreamKey))
    }
		if err := data.SetStreamKey(*newStreamKey); err != nil {
			log.Errorln("Error setting your stream key.", err)
			log.Exit(1)
		} else {
		  skey := *newStreamKey
      mask := "...." + skey[len(*newStreamKey)-4: len(*newStreamKey)]
			log.Infoln("Stream key changed to", mask)
		}
	}

  if *serverName != ""{
    utils.HostName = *serverName
    if err := data.SetStreamTitle(*serverName + " Broadcast"); err != nil {
      log.Errorln("Error setting your stream title.", err)
      log.Exit(1)
    }
    log.Println("Saving new stream title", *serverName + " Broadcast")
  }

  // Set the web server port
	if *webServerPortOverride != "" {
		portNumber, err := strconv.Atoi(*webServerPortOverride)
		if err != nil {
			log.Warnln(err)
			return
		}

		log.Println("Saving new web server port number to", portNumber)
		if err := data.SetHTTPPortNumber(float64(portNumber)); err != nil {
			log.Errorln(err)
		}
	}
	config.WebServerPort = data.GetHTTPPortNumber()

	// Set the web server ip
	if *webServerIPOverride != "" {
		log.Println("Saving new web server listen IP address to", *webServerIPOverride)
		if err := data.SetHTTPListenAddress(*webServerIPOverride); err != nil {
			log.Errorln(err)
		}
	}
	config.WebServerIP = data.GetHTTPListenAddress()

	// Set the rtmp server port
	if *rtmpPortOverride > 0 {
		log.Println("Saving new RTMP server port number to", *rtmpPortOverride)
		if err := data.SetRTMPPortNumber(float64(*rtmpPortOverride)); err != nil {
			log.Errorln(err)
		}
	}

	if *setOptionsOnly{
    log.Println("   Stream Name:", utils.HostName)
    log.Println("WebServer Port:", data.GetHTTPPortNumber())
    log.Println("     RTMP Port:", data.GetRTMPPortNumber())
    log.Println("    Stream Key:", data.GetStreamKey())
	  return
  }
	// starts the core
	if err := core.Start(); err != nil {
		log.Fatalln("failed to start the core package", err)
	}

	if err := router.Start(); err != nil {
		log.Fatalln("failed to start/run the router", err)
	}
}

func configureLogging(enableDebugFeatures bool, enableVerboseLogging bool) {
	logging.Setup(enableDebugFeatures, enableVerboseLogging)
	log.SetFormatter(&log.TextFormatter{
		FullTimestamp: true,
	})
}
