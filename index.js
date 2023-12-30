const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
require('dotenv').config()
app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const mongoose = require("mongoose")
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('mongoDB connected')
}).catch(err => { console.log(err + 'error while connecting mongoDB') })

let exercisesSchema = new mongoose.Schema({
  username: {
    type: String,
  },
  description: String,
  duration: {
    type: Number,
    // min: [5, 'must be alteat 5 minutes duration'] //"not required now so commented"
  },
  date: String,

  user_id: {
    type: mongoose.Schema.Types.ObjectId
  }
})


let userSchema = new mongoose.Schema({
  username: {
    type: String,
    require: true,
    unique: true
  },
  review: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "userModel"
  }
})

let userModel = mongoose.model('User', userSchema);
let exerciseModel = mongoose.model('Exercise', exercisesSchema);

app.post('/api/users', (req, res) => {

  return userModel.findOne({ username: req.body.username }).then(data => {
    //console.log(data);
    if (data) {
      return res.json({ username: data.username, _id: data._id })
    }
    let user = new userModel({ username: req.body.username })
    user.save().then((data) => {
      return res.json({ username: data.username, _id: data._id })
    }).catch(e => {
      return res.json({ e })
    })
    //console.log(req.body)

  }).catch(e => {
    //console.log('username not found err: ', e)
  })
})


app.post('/api/users/:id/exercises', (req, res) => {

  // exerciseModel.findByIdAndUpdate(
  //   { _id: req.body[':_id'] },
  //   {
  //     description: req.body.description,
  //     duration: req.body.duration,
  //     date: new Date(req.body.date).toUTCString()
  //   }).then(data => {
  //     return res.json(data)
  //   })
  //   .catch(e => //console.log({ e }))
  console.log(req.body)
  if (!mongoose.Types.ObjectId.isValid(req.body[':_id'])) {
    console.log('error', req.body)
    return res.json({ error: 'Invalid Object Id' })
  }
  console.log(req.body)
  return userModel.findById({ _id: req.body[':_id'] })
    .then(data => {

      let newexercise = new exerciseModel({
        user_id: req.body[':_id'],
        username: data.username,
        description: req.body.description,
        date: req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString(),
        duration: req.body.duration
      })

      return newexercise.save().then(data => {
        res.json({
          _id: data._id,
          username: data.username,
          date: data.date,
          duration: data.duration,
          description: data.description
        })
      }).catch(e => {
        res.json(e)
      })
    })

})


app.get('/api/users', (req, res) => {
  return userModel.find().then(data => {
    return res.json(data)
  })
})
app.get('/api/users/:_id/logs', (req, res) => {

  // userModel.aggregate([
  //   {
  //     $lookup: {
  //       from: 'exerciseModel',
  //       localField: 'user_id',
  //       foreignField: '_id',
  //       as: 'user_id'
  //     }
  //   },
  //   { $unwind: '$user_id' },
  //   { $match: { 'user_id.user_id': 'userId' } },
  //   { $group: { _id: null, count: { $sum: 1 } } }
  // ]).then(data => {
  //   //console.log({ data })
  // }).catch(e => {
  //   //console.log({ e })
  // })
  // if (req.query.from || req.query.to) {
  //   return userModel.findById({ _id: req.params._id })
  //     .then(userData => {
  //       exerciseModel.countDocuments({ user_id: userData._id })
  //         .then(count => {
  //           exerciseModel.find({
  //             user_id: userData._id
  //           })
  //             .where('date').gt(new Date(req.query.from).toDateString()).lt(new Date(req.query.to).toDateString())
  //             .limit(req.query.limit)
  //             .exec()
  //             .then(exercises => {
  //               return res.json({
  //                 username: userData.username,
  //                 count,
  //                 _id: userData._id,
  //                 log: exercises
  //               })
  //             })
  //         })
  //     }).catch(e => {
  //       res.json({ error: e })
  //     })
  // }

  return userModel.findById({ _id: req.params._id })
    .then(userData => {
      exerciseModel.find({
        user_id: userData._id
      })
        .limit(req.query.limit)
        .exec()
        .then(exercises => {
          // console.log(exercises, new Date(req.query.from).toDateString());
          // exercises = req.query.from || req.query.to ?
          //   exercises.filter((exercise) => {
          //     let newDate = (date) => {
          //       new Date(date).getTime()
          //       console.log(new Date(date).getTime())
          //     }
          //     return newDate(exercise.date) >= newDate(req.query.from)
          //       && newDate(exercise.date) <= newDate(req.query.to)
          //   }) : exercises

          if (req.query.from || req.query.to) {
            var from = new Date(req.query.from).getTime()

            to = new Date(req.query.to).getTime();

            if (isNaN(from)) {
              var result = exercises.filter(d => {
                let time = new Date(d.date).getTime()
                return (time <= to)
              })
            }
            else if (isNaN(to)) {
              var result = exercises.filter(d => {
                let time = new Date(d.date).getTime();
                return (time >= from)
              })
            } else {

              var result = exercises.filter(d => {
                let time = new Date(d.date).getTime();
                return (time >= from && time <= to)
              })
            }

            return res.json({
              username: userData.username,
              count: result.length,
              _id: userData._id,
              log: result
            })
          }
          return res.json({
            username: userData.username,
            count: exercises.length,
            _id: userData._id,
            log: exercises
          })
        })

    }).catch(e => {
      res.json({ error: e })
    })


})

app.post('*', (req, res) => {
  res.status(404)
  // if (req.accepts('html')) {
  //   res.render('404', { url: req.url })
  //   return
  // }

  // if (req.accepts('json')) {
  //   res.json({ error: 'Not found' })
  //   return
  // }

  res.type('txt').send('Not found').status(404)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
