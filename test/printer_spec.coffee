Printer = require("../lib/printer.coffee")
chai = require("chai")
spies = require('chai-spies')
EventEmitter = require('events').EventEmitter
require("sugar")

chai.use(spies)
chai.should()
expect = chai.expect

class DriverStub extends EventEmitter
  constructor: ->
    # Stub all the things!
    ['reset', 'sendNow', 'print'].each (key) =>
      @[key] = chai.spy (a,b) -> @emit("test_#{key}", a, b)

class PrintJobStub extends EventEmitter
  type: "job"
  status: "idle"
  constructor: (printer, attrs) ->
    @[k] = v for k, v of attrs
    Object.defineProperty @, 'printer', value: printer

  loadGCode: (cb) -> setTimeout.fill(undefined, 0) ->
    cb null, 'G91\nG1 F300\nG1 X10 Y20 Z5 F300'

  key: =>
    "jobs[#{@id}]"


describe 'Printer', ->
  driver = null
  printer = null

  beforeEach ->
    driver  = new DriverStub()
    initPrinter()

  initPrinter = (opts={}) ->
    comps = e0: 'heater', e1: 'heater', b: 'heater', c: 'conveyor', f: 'fan'
    printer = new Printer "AABB1337", driver, opts, comps, PrintJobStub

  addJob = (done, opts = {}) ->
    driver.emit "change", status: "idle"
    printer.on 'add', (key, @job) -> done?()
    opts.filePath = "#{__dirname}/assets/test.gcode"
    printer.addJob opts

  receiveWelcome = ->
    driver.emit "ready"

  describe 'addJob', ->

    it 'should store the job in the queue', ->
      printer.addJob {}
      printer.jobs.length.should.equal 1

    it 'should start job ids at 0', ->
      printer.addJob {}
      printer.jobs[0].id.should.equal 0

    it 'should ignore pased id attributes', ->
      printer.addJob id: 5
      printer.jobs[0].id.should.equal 0

    it 'should set the qty', ->
      printer.addJob qty: 5
      printer.jobs[0].qty.should.equal 5

    it 'should emit add', (done) ->
      printer.on 'add', (key, job) ->
        key.should.equal "jobs[0]"
        job.id.should.equal 0
        done()
      printer.addJob {}

    it 'should place the job at the end of the queue by default', ->
      printer.addJob {}
      printer.jobs[0].position.should.equal 0

  describe 'rm', ->
    it 'should remove an existing job without error and emit rm', (done) ->
      printer.on 'rm', (key) ->
        key.should.equal "jobs[0]"
        done()
      printer.addJob {}
      printer.rm "jobs[0]"

    it 'should error if the job does not exist', ->
      printer.addJob()
      printer.rm.bind(printer, "jobs[4]").should.throw()

  describe 'estop', ->
    it 'should reset the printer', ->
      printer.estop()
      driver.reset.should.be.called.once()

    it 'should set the status to estopped', (done) ->
      printer.on 'change', (data) ->
        data.state.status.should.equal 'estopped'
        done()
      printer.estop()

    it 'should error on other commands once estopped', ->
      printer.estop()
      printer.move.bind(x: 10).should.throw()

    it 'should estop the current print', (done) ->
      addJob()
      i = 0
      printer.on 'change', (data) -> switch i++
        when 0 then printer.estop()
        when 1 then onEstopped data
      onEstopped = (data) ->
        console.log "w00t!"
        console.log data
        expect(data?["jobs[0]"]?.status).to.equal 'estopped'
        done()
      printer.print()

  describe 'print', ->
    beforeEach addJob

    it 'should print if the printer is idle', (done) ->
      driver.on 'test_print', (gcode) ->
        expect(gcode).to.equal 'G91\nG1 F300\nG1 X10 Y20 Z5 F300'
        done()
      printer.print()

    it 'should change the printer\'s status to printing', (done) ->
      printer.on 'change', (data) ->
        data.status.should.equal 'printing'
        done()
      printer.print()

    it 'should change the job\'s status to printing', (done) ->
      printer.on 'change', (data) ->
        data['jobs[0]'].status.should.equal 'printing'
        done()
      printer.print()

    it 'should change the printer\'s status to idle after the print', (done) ->
      printer.print()
      printer.on 'change', (data) ->
        data.status.should.equal 'idle'
        printer.status.should.equal 'idle'
        done()
      driver.emit "print_complete", @job

    it 'should print continuously if pause_between_prints is false', (done) ->
      printer.print()
      printer.set pauseBetweenPrints: false
      printer.on 'change', (data) ->
        return unless data['jobs[0]']?.status == 'done'
        printer.status.should.equal 'printing'
        done()
      driver.emit "print_complete", @job

  describe 'print qty', ->
    it 'should print 3 copies if qty is 3', (done) ->
      addJob undefined, qty: 3
      printer.print()
      qtyPrinted = 0
      printer.on 'change', (data) ->
        return unless data['jobs[0]'].qtyPrinted > qtyPrinted
        qtyPrinted++
        if qtyPrinted == 3
          data['jobs[0]'].status.should.equal 'done'
          printer.status.should.equal 'idle'
          done()
        else
          expect(data['jobs[0]'].status).to.equal undefined
          printer.print()
          driver.emit "print_complete", @job
      driver.emit "print_complete", @job

  describe 'move', ->
    beforeEach receiveWelcome

    it 'should move the printer at z_feedrate on z', (done) ->
      driver.on 'test_sendNow', (gcode) ->
        gcode.should.equal 'G91\nG1 F300\nG1 X10 Y20 Z5 F300'
        done()
      printer.move(x: 10, y:20, z: 5)

    it 'should move the printer at x_feedrate on xy', (done) ->
      driver.on 'test_sendNow', (gcode) ->
        gcode.should.equal 'G91\nG1 F3000\nG1 X10 Y20 F3000'
        done()
      printer.move(x: 10, y:20)

    it 'should not move the printer on bad axes', ->
      printer.move.bind(e7: 10).should.throw()

    it 'should move the printer at the correct flowrate on e0', (done) ->
      driver.on 'test_sendNow', (gcode) ->
        gcode.should.equal 'T0\nG91\nG1 F40\nG1 E10 F40'
        done()
      printer.move e0: 10

    it 'should move the printer at the correct flowrate on e1', (done) ->
      driver.on 'test_sendNow', (gcode) ->
        gcode.should.equal 'T1\nG91\nG1 F40\nG1 E10 F40'
        done()
      printer.move e1: 10

  describe 'home', ->
    beforeEach addJob

    it 'should home the printer if it\'s idle', (done) ->
      driver.on 'test_sendNow', (gcode) ->
        gcode.should.equal 'G28 X Y Z'
        done()
      printer.home()

    it 'should home only the axes specified', (done) ->
      driver.on 'test_sendNow', (gcode) ->
        gcode.should.equal 'G28 X Y'
        done()
      printer.home(['x', 'y'])

    it 'should not home if the printer isn\'t idle', ->
      printer.print()
      printer.home.should.throw()

    it 'should throw an error if a invalid axis is given', ->
      printer.home.bind(printer, ['k']).should.throw()

  describe 'set', ->
    it 'should set a non-nested property on the printer'

    it 'should set a nested property on the printer'

    it 'shound not set a property if it doesn\'t exist'

    it 'should not change the type of a property'

    it 'should modify an existing job and emit change',(done) ->
      printer.on 'change', (data) ->
        data['jobs[0]'].should.not.have.property 'id'
        data['jobs[0]'].qty.should.equal 5
        done()
      printer.addJob {}
      printer.set "job[0]": {qty: 5}

    it 'should move a job and reorder other jobs around it',(done) ->
      printer.on 'change', (data) ->
        data.should.not.have.property "jobs[#{i}]" for i in [0, 3]
        data.should.have.property "jobs[#{i}]"     for i in [1, 2]
        data['jobs[2]'].position.should.equal 1
        data['jobs[1]'].position.should.equal 2
        done()
      printer.addJob {} for i in [0..3]
      printer.set "job[2]": {position: 1}

    it 'should move a job to position 0 and move all jobs down',(done) ->
      printer.on 'change', (data) ->
        data['jobs[1]'].position.should.equal 0
        data['jobs[0]'].position.should.equal 1
        done()
      printer.addJob {} for i in [0..1]
      printer.set "job[1]":  {position: 0}

    it 'should error if a invalid job id is given', ->
      fn = printer.set.bind(printer, "job[12]": {qty: 5, position: 0})
      fn.should.throw()

    it 'should error if a invalid position is given', ->
      printer.addJob()
      fn = printer.set.bind(printer, "job[0]": {position: 1})
      fn.should.throw()

    it 'should error if a negative qty is given', ->
      printer.addJob()
      fn = printer.set.bind(printer, "job[0]": {qty: -5})
      fn.should.throw()
