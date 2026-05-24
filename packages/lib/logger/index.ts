import { Logger } from 'tslog'

export const logger = new Logger({
    hideLogPositionForProduction: true,
    prettyInspectOptions: { depth: 5 },
    prettyLogTemplate: `{{logLevelName}} ${process.env.NODE_ENV !== 'production' ? '{{dateIsoStr}} ' : ''}{{nameWithDelimiterSuffix}}`,
    prettyLogStyles: {
        logLevelName: {
            TRACE: ['bold', 'green'],
            DEBUG: ['bold', 'dim'],
            INFO: ['bold', 'blue'],
            WARN: ['bold', 'yellow'],
            ERROR: ['bold', 'red'],
            FATAL: ['bold', 'magenta'],
        },
    },
    type: process.env.NODE_ENV === 'production' ? 'json' : 'pretty',
    // type: 'pretty',
    minLevel: process.env.NODE_ENV === 'production' ? 3 : 0,
}) as Logger<unknown> & {
    pathname: (request: string | URL | Request) => string
}
