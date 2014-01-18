PrintDriver = require "../lib/drivers/serial_gcode_driver/serial_gcode_driver.coffee"

chai = require("chai")
spies = require('chai-spies')
require("sugar")

chai.use(spies)
chai.should()

EventEmitter = require('events').EventEmitter
class SerialStub extends EventEmitter
  constructor: ->
    @write = chai.spy (line) -> @emit "test_write", line
    @close = (fn) -> fn()
    @options = {}

describe 'SerialGCodeDriver', ->
  printer = null
  onWrite = null

  receive = (line) ->
    printer.serialPort.emit('data', line)

  receiveStart = (done) ->
    receive "start"
    printer.once "ready", done

  ackGCodes = (response = "ok") ->
    printer.serialPort.on "test_write", (line) -> receive response

  beforeEach ->
    printer = new PrintDriver port: {}, driver: {}, polling: false, SerialStub
    printer.greetingTimeout = 0
    printer.pollingInterval = 0
    onWrite = printer.serialPort.write

  afterEach ->
    printer.kill()

  it 'should not fire a ready event on receipt of a bad greeting', ->
    spy = chai.spy()
    printer.on "ready", spy
    spy.should.not.have.been.called()

  it 'should fire a ready event on receipt of a greeting', (done) ->
    printer.on "ready", done
    receive "start"

  describe "sendNow", ->
    it 'should not send if the print has not received a greeting', ->
      printer.sendNow "M105"
      onWrite.should.not.have.been.called()

  describe "sendNow", ->
    beforeEach receiveStart

    it 'should send gcode with checksums and line numbers', (done) ->
      printer.serialPort.on "test_write", (line) ->
        line.should.equal("N1 M105*38\n")
        done()
      printer.sendNow "M105"

    it 'should send immediately if the print isn\'t busy', ->
      ackGCodes()
      printer.sendNow "M105"
      onWrite.should.have.been.called()

    it 'should not send the next line if it does not receives an \'ok\'', ->
      spy = chai.spy()
      printer.serialPort.on "test_write", spy
      printer.sendNow "M105\nM105"
      spy.should.have.been.called.once()

    it 'should send the next line if it receives an \'ok\'', ->
      ackGCodes()
      printer.sendNow "M105\nM105"
      onWrite.should.have.been.called.twice()

    it 'should remove empty lines and comment lines from gcode', ->
      ackGCodes()
      printer.sendNow "M105\n\n     \nM105\n;comment\n(comment)\n ;comment\n"
      onWrite.should.have.been.called.twice()

    it 'should trim whitespace and comments from gcode lines', (done) ->
      printer.serialPort.on "test_write", (line) ->
        line.should.equal("N1 M105*38\n")
        done()
      printer.sendNow "       M105     ;comment"

  describe "print", ->
    it 'should queue if the printer is not ready yet', ->
      printer.print "M105"
      onWrite.should.not.have.been.called()

  describe "print", ->
    beforeEach receiveStart

    it 'should start printing immediately if the printer is not busy', ->
      printer.print "M105"
      onWrite.should.have.been.called()

    it 'should queue if the printer is busy', ->
      printer.sendNow "M105"
      printer.print "M105"
      onWrite.should.have.been.called.once()

    it 'should print once the printer is ready', ->
      printer.print "M105"
      onWrite.should.have.been.called()

    it 'should not mark the job as completed until the lsat gcode is ok\'d', ->
      spy = chai.spy()
      printer.on 'print_complete', spy
      printer.print "M105"
      spy.should.not.have.been.called()

    it 'should fire a \'print_complete\' event when the print is done', ->
      ackGCodes()
      spy = chai.spy()
      printer.on 'print_complete', spy
      printer.print "M105"
      spy.should.have.been.called()

  describe "isClearToSend", ->
    beforeEach receiveStart

    it 'should return true if the printer is not busy', ->
      ackGCodes()
      printer.sendNow "M105"
      printer.isClearToSend().should.equal true

    it 'should return false if the printer is busy', ->
      printer.sendNow "M105"
      printer.isClearToSend().should.equal false

  describe "isClearToSend", ->
    it 'should return false if the printer is not ready yet', ->
      printer.isClearToSend().should.equal false

  describe "isPrinting", ->
    beforeEach receiveStart

    it 'should return false if the printer is not printing', ->
      printer.isPrinting().should.equal(false)

    it 'should return true if the printer is printing', ->
      printer.print "M105\nM105"
      printer.isPrinting().should.equal(true)

    it 'should return false if the printer has finished a print', ->
      ackGCodes()
      printer.print "M105\nM105"
      printer.isPrinting().should.equal(false)

  describe "startPolling", ->
    beforeEach receiveStart
    afterEach -> printer.kill()

    it 'should send a initial temperature request', ->
      printer.startPolling()
      onWrite.should.have.been.called()

    it 'should send a temperature request upon receiving a response', (done) ->
      printer.startPolling()
      receive "ok T: 10 w:3"
      printer.serialPort.on "test_write", ->
        onWrite.should.have.been.called.twice()
        done()

    it 'should not send more then one request per pollingInterval', (done) ->
      printer.pollingInterval = 1000*60
      printer.startPolling()
      printer.on "change", ->
        onWrite.should.have.been.called.once()
        done()
      receive "ok T: 10 w:3"

  describe "events", ->
    beforeEach receiveStart

    it 'should emit current_temp changes', (done) ->
      ackGCodes("ok T: 10")
      printer.on "change", (data) ->
        data.e0.should.deep.equal current_temp: 10
        done()
      printer.sendNow "M105"

    it 'should filter out non-temperature values from current_temps', (done) ->
      printer.on "change", (data) ->
        Object.keys(data).should.deep.equal ['e0', 'b']
        done()
      receive 'ok T:95.7 /0.0 B:0.0 /0.0 @:0'

    it 'should emit target_temp_countdown and blocking changes on ok', (done) ->
      printer.sendNow "M109 S220"
      expected = current_temp: 10, target_temp_countdown: 3000, blocking: false
      printer.on "change", (data) ->
        data.e0.should.deep.equal expected
        done()
      receive "ok T: 10 w:3"

    it 'should emit a blocking and target_temp change on M109', (done) ->
      printer.on "change", (data) ->
        data.e0.should.deep.equal target_temp: 220, blocking: true
        done()
      printer.sendNow "M109 S220"

    it 'should emit a blocking change after oking a M109', (done) ->
      printer.sendNow "M109 S220"
      printer.on "change", (data) ->
        data.e0.should.deep.equal  current_temp: 10, blocking: false
        done()
      receive "ok T:10"

    it 'should emit errors when a error response is received', (done) ->
      printer.on "printer_error", (data) ->
        data.should.equal "ERROR: this is a test"
        done()
      receive "ERROR: this is a test"
