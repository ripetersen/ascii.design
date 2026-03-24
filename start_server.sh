#!/bin/bash
PYTHON_EXE=""
python -V > /dev/null
if [ "$?" -ne 127 ]
then
	PYTHON_EXE=python
	echo "python found"
else
	python3 -V > /dev/null
	if [ "$?" -eq 127 ]
	then
		echo "No python found"
		exit 1
	fi
	PYTHON_EXE=python3
	echo "python3 found"
fi
$PYTHON_EXE -m http.server 8888 --directory ./src/
