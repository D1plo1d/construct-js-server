import fs from '../../util/promisifiedFS'
import expectToMatchImmutableSnapshot from '../../util/testing/expectToMatchImmutableSnapshot'
import createJob from './createJob'

describe('createJob', () => {
  it('creates a CREATE_JOB action', async () => {
    const name = 'test_test_test'
    const files = [
      {
        name: 'file_A',
        content: 'G28',
      },
      {
        name: 'file_B',
        content: 'G1 X10\nG1 Y10\nG1 Z10',
      },
    ]

    const dispatch = action => action

    const result = await createJob({
      files,
      name,
    })(dispatch)

    expectToMatchImmutableSnapshot({
      result,
      redactions: [
        ['payload', 'job', 'id'],
        ['payload', 'job', 'createdAt'],
        ['payload', 'jobFiles'],
      ],
    })

    const jobFiles = Object.values(result.payload.jobFiles)
    // eslint-disable-next-line no-restricted-syntax
    for (const jobFile of jobFiles) {
      expectToMatchImmutableSnapshot({
        result: jobFile,
        redactions: [
          ['id'],
          ['filePath'],
          ['jobID'],
        ],
      })
      // eslint-disable-next-line no-await-in-loop
      const content = await fs.readFileAsync(jobFile.filePath, 'utf8')
      expect(content).toMatchSnapshot()

      /* clean up tmp file */
      // eslint-disable-next-line no-await-in-loop
      await fs.unlinkAsync(jobFile.filePath)
    }
  })
})
