import React from 'react';

import MonoText from '../MonoText';
import { EnumParameter, FunctionArgument, FunctionParameter, ObjectParameter } from './index.types';
import { isCurrentPlatformSupported } from './utils';

export default function FunctionSignature(props: {
  namespace: string;
  name: string;
  parameters: FunctionParameter[];
  args: FunctionArgument[];
}) {
  return <MonoText>{generateFunctionSignature(props)}</MonoText>;
}

export function generateFunctionSignature({
  namespace,
  name,
  parameters,
  args,
}: {
  namespace: string;
  name: string;
  parameters: FunctionParameter[];
  args: FunctionArgument[];
}) {
  return `${namespace}.${name}(${argumentsToString(args, parameters)})`;
}

function argumentsToString(args: FunctionArgument[], parameters: FunctionParameter[]) {
  return parameters
    .map((parameter, idx) => {
      if (!isCurrentPlatformSupported(parameter.platforms)) {
        return;
      }
      switch (parameter.type) {
        case 'object':
          return convertObjectArgumentToString(args[idx], parameter);
        case 'enum':
          return convertEnumArgumentToString(args[idx], parameter);
        case 'constant':
          return parameter.name;
        default:
          return String(args[idx]);
      }
    })
    .filter((arg) => !!arg) // filter out all void values
    .join(', ');
}

function convertObjectArgumentToString(arg: FunctionArgument, parameter: ObjectParameter) {
  const properties = parameter.properties
    .map((property) => {
      // skip object properties unsupported on the current platform
      if (!isCurrentPlatformSupported(property.platforms)) {
        return;
      }

      if (typeof arg !== 'object' || Array.isArray(arg) /** filter out tuples/arrays */) {
        throw new Error(
          `Value ${arg} is not an object. Expecting object for ${parameter.name} argument`
        );
      }

      if (!(property.name in arg)) {
        throw new Error(
          `Property ${
            property.name
          } is missing in argument. Available parameter properties: ${parameter.properties
            .map((p) => p.name)
            .join(', ')} and argument properties: ${Object.keys(arg).join(', ')}`
        );
      }

      const value = arg[property.name];

      // skip `undefined` values
      if (value === undefined) {
        return;
      }

      if (property.type === 'enum') {
        return `${property.name}: ${convertEnumArgumentToString(value, property)}`;
      }

      return `${property.name}: ${property.type === 'string' ? `"${value}"` : value}`;
    })
    .filter((entry) => !!entry) // filter out all void values
    .join(',\n  ');

  return `{\n  ${properties}\n}`;
}

function convertEnumArgumentToString(arg: FunctionArgument, { name, values }: EnumParameter) {
  // this should always find the current value for the enum, if failed something is messed up somewhere else
  // eslint-disable-next-line no-case-declarations
  const value = values.find(({ value }) =>
    typeof value === 'object' && typeof arg === 'object'
      ? JSON.stringify(value) === JSON.stringify(arg) // for tuple case
      : value === arg
  );
  if (!value) {
    throw new Error(
      `Value ${arg} not found in available values for enum parameter ${name}. Available values: ${values
        .map((v) => `${v.name} -> ${v.value}`)
        .join(', ')}`
    );
  }
  return value.name;
}
