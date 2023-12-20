import _ from "lodash";

export default {
  isSet(value) {
    return _.isBoolean(value) || _.isDate(value) || !(_.isNil(value) || (!_.isNumber(value) && _.isEmpty(value)) || (_.isNumber(value) && value === 0));
  },
};
