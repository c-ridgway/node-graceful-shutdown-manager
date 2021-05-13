#!/bin/bash

# Creates app shortcut on Linux when first started as root:
# DIRNAME start
# DIRNAME stop
# DIRNAME view

(
COMMAND="npm run production && sleep 2"
DIR_PATH=`dirname \`readlink -f $0\``
SESSION_NAME=`basename "$DIR_PATH"`

# Create link when ran as root
if (( $EUID == 0 )); then
  if [[ ! -f "/usr/local/bin/$SESSION_NAME" ]]; then
    ln -s "$DIR_PATH/run" "/usr/local/bin/$SESSION_NAME"
    echo "Created bin link"
  else
    echo "Please don't run as root"
  fi

  exit;
fi

if [[ ! -f "/usr/local/bin/$SESSION_NAME" ]]; then
  echo "Please run script as root to generate bin link"
  exit;
fi

# Jump to script directory
cd "$DIR_PATH"

#
if [[ -z "$1" ]]; then
  echo "Please specify action 'start|stop|view'"
  exit;
fi

session=`screen -list | grep "$SESSION_NAME"`

if [ "$1" = "start" ]; then
  if [[ ! -z "$session" ]]; then
    ./run stop
    exit;
  fi

  screen -S "$SESSION_NAME" -dm bash -c "$COMMAND"
  echo "Info: Start session."

  if [[ "$2" == 1 ]]; then
    $0 view
  fi
elif [ "$1" = "stop" ]; then
  if [[ ! -z "$session" ]]; then
    screen -X -S "$SESSION_NAME" stuff "^C"

    #screen -X -S "$SESSION_NAME" quit
    echo "Info: Stopped app."
    exit;
  fi

  echo "Error: No session."
elif [ "$1" = "view" ]; then
  if [[ -z "$session" ]]; then
    echo "Error: App isn't running."
    exit;
  fi

  screen -dr "$SESSION_NAME"
fi

screen -ls
)