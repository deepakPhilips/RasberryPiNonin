Last login: Tue Apr 15 11:06:41 on ttys026
deepak@MACRG4C5JCY19 ~ % ssh deepak@172.20.10.9
deepak@172.20.10.9's password: 
Linux Nonin3230 6.6.51+rpt-rpi-v7 #1 SMP Raspbian 1:6.6.51-1+rpt3 (2024-10-08) armv7l

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
Last login: Tue Apr 15 00:00:05 2025
deepak@Nonin3230:~ $ cd Desktop/
deepak@Nonin3230:~/Desktop $ cd BleAdvertise/
deepak@Nonin3230:~/Desktop/BleAdvertise $ ls 
ble-peripheral.js  Thermometer
deepak@Nonin3230:~/Desktop/BleAdvertise $ cd Thermometer/
deepak@Nonin3230:~/Desktop/BleAdvertise/Thermometer $ cd ~
deepak@Nonin3230:~ $ ls 
ble-peripheral     Documents      node_modules       Python-2.7.18
ble_peripheral.py  Downloads      package.json       Python-2.7.18.tgz
Bookshelf          exmpleNode.js  package-lock.json  Templates
cputemp            Music          Pictures           Videos
Desktop            myenv          Public
deepak@Nonin3230:~ $ cd cputemp/
deepak@Nonin3230:~/cputemp $ ls 
advertisement.py    noninDevice.py       README.md
bletools.py         nonin_simulator.js   service.py
BP.js               outputOX.txt         simple_ble.js
cpu-temperature.js  package.json         temperature-characteristic.js
cputemp.py          package-lock.json    temp-service.js
index.js            philipsOximeter1.js  unit-characteristic.js
LICENSE             philipsOximeter.js
node_modules        __pycache__
deepak@Nonin3230:~/cputemp $ nano cputemp.py

  GNU nano 7.2                       cputemp.py                                 
        value = []
        desc = self.UNIT_DESCRIPTOR_VALUE

        for c in desc:
            value.append(dbus.Byte(c.encode()))

        return value

app = Application()
app.add_service(ThermometerService(0))
app.register()

adv = ThermometerAdvertisement(0)
adv.register()

try:
    app.run()
except KeyboardInterrupt:
    app.quit()
