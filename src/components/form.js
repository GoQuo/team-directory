import React, { Component, PropTypes } from 'react';
import { validateMapboxEmail, normalizeTel } from '../utils';
import ReactDOM from 'react-dom';
import linkState from 'react-link-state';

export default class Form extends Component {
  constructor(props, context) {
    super(props, context);
    const { user, data } = this.props;

    this.state = data.reduce((memo, section) => {
      section.data.forEach((field) => {
        memo[field.key] = (user && user[field.key]) ? user[field.key] : '';
      });
      return memo;
    }, {});
  }

  submittedData() {
    this.transitionTo('index'); // Redirect to the home page
  }

  verify(e) {
    const { setError } = this.props;
    const value = e.target.value.toLowerCase();

    if (this.exists(value) && !this.props.user) {
      setError('User "' + value + '" already exists.');
    }

    this.setState({
      github: value
    });
  }

  exists(value) {
    var { people } = this.props;
    return people.some((user) => {
      return user.github.toLowerCase() === value.toLowerCase();
    });
  }

  formData() {
    const { data } = this.props;
    let formData = [];

    for (const p in data) {
      formData = formData.concat(data[p].data);
    }
    return formData;
  }

  onSubmit(e) {
    e.preventDefault();
    const data = this.state;
    const { setError, validators, normalizers } = this.props;

    // - Check that GitHub username does not exist.
    if (this.exists(this.state.github) && !this.props.user) {
      return setError('User "' + this.state.github + '" already exists.');
    }

    // - Check all the required fields.
    const missingRequired = this.formData().filter((d) => {
      return d.required;
    }).filter((d) => {
      let contains;

      for (let key in data) {
        let value;
        if (data[key] && data[d.key]) value = data[d.key];
        if (typeof value === 'string' && value ||
            typeof value === 'object' && value.length) contains = true;
      }

      return !contains;
    });

    if (missingRequired.length) {
      const requiredList = missingRequired.reduce((memo, req) => {
        memo.push('"' + req.label + '"');
        return memo;
      }, []).join(', ');

      return setError('Missing required fields: ' + requiredList);
    }

    // Valid mobile number was passed.
    if (isNaN(parseInt(data.cell, 10))) {
      return setError('Mobile number must be a valid number');
    }

    // - Check Other => City rule
    if (data.office === 'other' && !data.city) {
      return setError('You selected "Other" under "Mapbox Office" which requires the "City" field to be filled out.');
    }

    // - Check Peru => DNI record
    if (data.office === 'ayacucho' && !data.dni) {
      return setError('Because you selected "Peru" as your home office, please provide a value for "DNI Number"');
    }

    if (!validateMapboxEmail(data.email)) {
      return setError(data.email + ' should be a valid @mapbox email');
    }

    // - Normalize everything.
    for (const key in data) {

      // Remove unfilled values
      if (!data[key]) delete data[key];

      if (typeof data[key] === 'string') {

        // Normalize telephone number.
        if (data.cell) data.cell = normalizeTel(data.cell);

        // Lowercase github username.
        if (key === 'github') data[key] = data[key].toLowerCase();

        // - Remove any superflous @ character + trim string.
        data[key] = data[key].trim().replace(/^@/, '');
      } else if (typeof data[key] === 'object') {
        // - Trim input.
        // data[key] = this.trimInArray(data[key]);
        data[key] = data[key].filter((d) => {
          let hasValue;
          for (let prop in d) {
            if (d[prop]) hasValue = true;
          }
          return hasValue;
        });
      }
    }

    // - Submit!
    actions.submitUserData(data);
  }

  destroyUser(e) {
    e.preventDefault();
    const { setError } = this.props;
    const user = this.getParams().user;
    const prompt = window.prompt('Are you sure? Enter their GitHub username to continue');

    if (prompt === user) {
      actions.destroyUser(this.getParams().user);
    } else {
      actions.setError('GitHub account name was not entered correctly.');
    }
  }

  radioOnChange(e) {
    const obj = {};
    obj[e.target.name] = e.target.id;
    this.setState(obj);
  }

  checkboxOnChange(e) {
    const group = ReactDOM.findDOMNode(this.refs[e.target.name]).getElementsByTagName('input');
    const checked = [];
    Array.prototype.forEach.call(group, (el) => {
      if (el.checked) checked.push(el.id);
    });

    const obj = {};
    obj[e.target.name] = checked;
    this.setState(obj);
  }

  addGroupOnChange(e) {
    const group = ReactDOM.findDOMNode(this.refs[e.target.name]).getElementsByTagName('div');
    const groupSet = [];

    Array.prototype.forEach.call(group, (el) => {
      const item = el.getElementsByTagName('input');
      const pairings = [];

      // Name/Value pairings
      Array.prototype.forEach.call(item, (itm) => {
        pairings.push(itm.value);
      });

      if (pairings[0] || pairings[1]) {
        groupSet.push({
          name: pairings[0],
          value: pairings[1]
        });
      }
    });

    const obj = {};
    obj[e.target.name] = groupSet;
    this.setState(obj);
  }

  addtoAddGroup(e) {
    e.preventDefault();
    const addGroup = this.state[e.target.name] ?
      this.state[e.target.name] : [];
    addGroup.push({name: '', value: ''});

    const obj = {};
    obj[e.target.name] = addGroup;
    this.setState(obj);
  }

  render() {
    const { data, user } = this.props;

    /*
    this.admin = (this.props.profile.admin && // User is an admin
                  this.props.user && // Existing user was passed as prop
                  this.props.user.github !== this.props.profile.github) ? // Profile does not match currently edited profile
                   true : false;
    */

    const colN = function(length) {
      if (length === 2) return 6;
      if (length === 3) return 4;
      if (length === 4) return 3;
      if (length > 4 || length === 1) return 12;
    };

    const renderRadioGroup = function(component, field, i) {
      const n = colN(this.fields.length);
      const labelClass = 'button icon check col' + n;
      const containerClass = 'react set' + n;
      return (
        <div className={containerClass} key={i}>
          <input
            type='radio'
            name={this.key}
            id={field.key}
            defaultChecked={component.state[this.key] === field.key}
            onChange={component.radioOnChange.bind(component)}
          />
          <label htmlFor={field.key} className={labelClass}>{field.label}</label>
        </div>
      );
    };

    const renderCheckGroup = function(component, field, i) {
      const n = colN(this.fields.length);
      const labelClass = 'button icon check col' + n;
      const containerClass = 'react set' + n;

      return (
        <div className={containerClass} key={i}>
          <input
            type='checkbox'
            name={this.key}
            id={field.key}
            defaultChecked={component.state[this.key].indexOf(field.key) > -1}
            onChange={component.checkboxOnChange.bind(component)}
          />
          <label htmlFor={field.key} className={labelClass}>{field.label}</label>
        </div>
      );
    };

    const renderAddGroup = function(component, field, i) {
      return (
        <div className='col12 clearfix' key={i}>
          <input
            type='text'
            className='col6'
            name={this.key}
            placeholder='Name'
            defaultValue={field.name}
            onChange={component.addGroupOnChange.bind(component)}
          />
          <input
            type='text'
            name={this.key}
            className='col6'
            placeholder='Value'
            defaultValue={field.value}
            onChange={component.addGroupOnChange.bind(component)}
          />
        </div>
      );
    };

    const addFields = function(d, i) {
      const type = (d.type) ? d.type : 'text';
      const hidden = (type === 'hidden') ? 'hidden' : false;

      // fields accessible by admin status only
      // if (d.key === 'payroll' && !this.admin) return;
      return (
        <fieldset id={d.key} key={i} className={`col6 pad1x ${hidden}`}>
          <label>{d.label} {d.required && <sup title='Field is required'>*</sup>}</label>
          {type === 'textarea' && <textarea
            className='col12'
            placeholder={d.label}
            required={d.required}
            valueLink={linkState(this, d.key)}
          />}
          {d.key === 'github' && <input
            type={type}
            className='col12'
            placeholder={d.label}
            required={d.required}
            onChange={this.verify.bind(this)}
            defaultValue={this.state.github}
          />}
          {type === 'hidden' && <input
            type={type}
            className='hidden'
            valueLink={linkState(this, d.key)}
          />}
          {type === 'text' && d.key !== 'github' && <input
            type={type}
            className='col12'
            placeholder={d.label}
            required={d.required}
            valueLink={linkState(this, d.key)}
          />}
          {type === 'date' && <input
            type={type}
            className='col12'
            placeholder={d.label}
            required={d.required}
            valueLink={linkState(this, d.key)}
          />}
          {type === 'radio' && <fieldset
            className='radio-pill pill clearfix col12'>
            {d.fields.map(renderRadioGroup.bind(d, this))}
          </fieldset>}
          {type === 'checkbox' && <fieldset
            ref={d.key}
            className='checkbox-pill pill clearfix col12'>
            {d.fields.map(renderCheckGroup.bind(d, this))}
          </fieldset>}
          {type === 'add' && <fieldset ref={d.key}>
            {linkState(this, d.key).value && linkState(this, d.key).value.map(renderAddGroup.bind(d, this))}
            <button
              name={d.key}
              onClick={this.addtoAddGroup}
              className='button icon plus round-bottom col12'>
              Add
            </button>
          </fieldset>}
        </fieldset>
      );
    }.bind(this);

    const renderSection = function(section, i) {
      return (
        <fieldset className='fill-grey round pad1x pad2y' key={i}>
          <h2 className='block pad1x space-bottom1'>{section.section}</h2>
          <fieldset className='col12 clearfix'>
            {section.data.map(addFields)}
          </fieldset>
        </fieldset>
      );
    };

    return (
      <form onSubmit={this.onSubmit.bind(this)}>
        {data.map(renderSection)}
        <fieldset className='col12 clearfix'>
          <div className='col8 pad2x'>
            &nbsp;
            {user && <button
              className='button fill-red icon close pad2x'
              onClick={this.destroyUser}>
              Delete user
            </button>}
          </div>
          <div className='col4 pad2x'>
            <input type='submit' className='button col12' />
          </div>
        </fieldset>
      </form>
    );
  }
}

Form.propTypes = {
  data: PropTypes.array.isRequired,
  setError: PropTypes.func.isRequired,
  people: PropTypes.array.isRequired,
  user: PropTypes.array,
  validators: PropTypes.func,
  normalizers: PropTypes.func
}
