#!/bin/bash
sudo systemctl stop bluetooth
sudo hciconfig hci0 up
sudo btmgmt -i hci0 pairable on
sudo btmgmt -i hci0 connectable on
sudo btmgmt -i hci0 bondable on
sudo systemctl start bluetooth